import path from 'pathe';
import { z } from 'zod';
import type { SkillManager, SkillMetadata } from '../skill';
import { createTool } from '../tool';
import { safeStringify } from '../utils/safeStringify';
import { TOOL_NAMES } from '../constants';

function renderAvailableSkills(skills: SkillMetadata[]): string {
  return skills
    .map(
      (skill) =>
        `<skill>\n<name>${skill.name}</name>\n<description>${skill.description}</description>\n</skill>`,
    )
    .join('\n');
}

function generateDescription(skillManager: SkillManager): string {
  const skills = skillManager.getSkills();
  return `Execute a skill within the main conversation
<skills_instructions>
When users ask you to perform tasks, check if any of the available skills below match the task. If a skill matches, use this tool to invoke it. Skills provide specialized knowledge and procedures for specific tasks.
</skills_instructions>
<available_skills>
${renderAvailableSkills(skills)}
</available_skills>`;
}

export function createSkillTool(opts: { skillManager: SkillManager }) {
  return createTool({
    name: TOOL_NAMES.SKILL,
    description: generateDescription(opts.skillManager),
    parameters: z.object({
      skill: z.string().describe('The skill name to execute'),
    }),
    getDescription: ({ params }) => {
      return params.skill;
    },
    async execute({ skill }) {
      const trimmed = skill.trim();
      const skillName = trimmed.startsWith('/')
        ? trimmed.substring(1)
        : trimmed;
      const foundSkill = opts.skillManager.getSkill(skillName);

      if (!foundSkill) {
        return {
          isError: true,
          llmContent: `Skill "${skillName}" not found`,
        };
      }

      const body = await opts.skillManager.readSkillBody(foundSkill);
      const baseDir = path.dirname(foundSkill.path);

      const messages = [
        {
          type: 'text',
          text: `<command-message>${skillName} is running…</command-message>\n<command-name>${skillName}</command-name>`,
        },
        {
          type: 'text',
          text: `Base directory for this skill: ${baseDir}\n\n${body}`,
          isMeta: true,
        },
      ];

      return {
        llmContent: safeStringify(messages),
        returnDisplay: `Loaded skill: ${foundSkill.name}`,
      };
    },
    approval: { category: 'read' },
  });
}
