import fs from 'fs';
import path from 'pathe';
import type { Paths } from './paths';

// Data Models

/**
 * Metadata stored in memory (lean) - only name and description
 */
export interface SkillMetadata {
  name: string;
  description: string;
  path: string;
}

export interface SkillError {
  path: string;
  message: string;
}

export interface SkillLoadOutcome {
  skills: SkillMetadata[];
  errors: SkillError[];
}

// Validation constants
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;

// Regex to match $skillName mentions in text
const SKILL_MENTION_REGEX = /\$([a-zA-Z][a-zA-Z0-9_-]*)/g;

export interface SkillManagerOpts {
  paths: Paths;
}

export class SkillManager {
  private skills: SkillMetadata[] = [];
  private errors: SkillError[] = [];
  private paths: Paths;

  constructor(opts: SkillManagerOpts) {
    this.paths = opts.paths;
    this.loadSkills();
  }

  /**
   * Get all loaded skills
   */
  getSkills(): SkillMetadata[] {
    return this.skills;
  }

  /**
   * Get all loading errors
   */
  getErrors(): SkillError[] {
    return this.errors;
  }

  /**
   * Find skill mentions ($skillName) in text
   */
  findSkillMentions(text: string): SkillMetadata[] {
    const mentions: SkillMetadata[] = [];
    const matches = text.matchAll(SKILL_MENTION_REGEX);

    for (const match of matches) {
      const skillName = match[1];
      const skill = this.skills.find((s) => s.name === skillName);
      if (skill && !mentions.find((m) => m.name === skill.name)) {
        mentions.push(skill);
      }
    }

    return mentions;
  }

  /**
   * Read the full body of a skill file
   */
  async readSkillBody(skill: SkillMetadata): Promise<string> {
    try {
      return fs.readFileSync(skill.path, 'utf-8');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error reading skill';
      throw new Error(`Failed to read skill ${skill.name}: ${message}`);
    }
  }

  /**
   * Format skill injection for LLM context
   */
  formatSkillInjection(
    name: string,
    skillPath: string,
    contents: string,
  ): string {
    return `<skill>
<name>${name}</name>
<path>${skillPath}</path>
${contents}
</skill>`;
  }

  /**
   * Load skills from global and project directories
   */
  private loadSkills(): void {
    this.skills = [];
    this.errors = [];

    // Global skills: ~/.${productName}/skills/
    const globalSkillsDir = path.join(this.paths.globalConfigDir, 'skills');
    this.loadSkillsFromDirectory(globalSkillsDir);

    // Project skills: .${productName}/skills/
    const projectSkillsDir = path.join(this.paths.projectConfigDir, 'skills');
    this.loadSkillsFromDirectory(projectSkillsDir);
  }

  /**
   * Load skills from a specific directory
   */
  private loadSkillsFromDirectory(skillsDir: string): void {
    if (!fs.existsSync(skillsDir)) {
      return;
    }

    try {
      const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
          if (fs.existsSync(skillPath)) {
            this.loadSkillFile(skillPath);
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error scanning directory';
      this.errors.push({
        path: skillsDir,
        message: `Failed to scan skills directory: ${message}`,
      });
    }
  }

  /**
   * Load and validate a single skill file
   */
  private loadSkillFile(skillPath: string): void {
    try {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const parsed = this.parseSkillFile(content, skillPath);

      if (parsed) {
        // Check for duplicate names (project-local overrides global)
        const existingIndex = this.skills.findIndex(
          (s) => s.name === parsed.name,
        );
        if (existingIndex !== -1) {
          this.skills[existingIndex] = parsed;
        } else {
          this.skills.push(parsed);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error loading skill';
      this.errors.push({
        path: skillPath,
        message,
      });
    }
  }

  /**
   * Parse skill file content and extract metadata
   */
  private parseSkillFile(
    content: string,
    skillPath: string,
  ): SkillMetadata | null {
    // Parse frontmatter (YAML between --- delimiters)
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatterMatch) {
      this.errors.push({
        path: skillPath,
        message: 'Missing frontmatter (must be delimited by ---)',
      });
      return null;
    }

    const frontmatter = frontmatterMatch[1];
    const metadata: Partial<SkillMetadata> = { path: skillPath };

    // Parse YAML fields manually (simple key: value format)
    const lines = frontmatter.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (key === 'name') {
          metadata.name = value.trim();
        } else if (key === 'description') {
          metadata.description = value.trim();
        }
      }
    }

    // Validate required fields
    if (!metadata.name) {
      this.errors.push({
        path: skillPath,
        message: 'Missing required field: name',
      });
      return null;
    }

    if (!metadata.description) {
      this.errors.push({
        path: skillPath,
        message: 'Missing required field: description',
      });
      return null;
    }

    // Validate field constraints
    if (metadata.name.length > MAX_NAME_LENGTH) {
      this.errors.push({
        path: skillPath,
        message: `Name exceeds maximum length of ${MAX_NAME_LENGTH} characters`,
      });
      return null;
    }

    if (metadata.name.includes('\n')) {
      this.errors.push({
        path: skillPath,
        message: 'Name must be a single line',
      });
      return null;
    }

    if (metadata.description.length > MAX_DESCRIPTION_LENGTH) {
      this.errors.push({
        path: skillPath,
        message: `Description exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`,
      });
      return null;
    }

    if (metadata.description.includes('\n')) {
      this.errors.push({
        path: skillPath,
        message: 'Description must be a single line',
      });
      return null;
    }

    return metadata as SkillMetadata;
  }
}

/**
 * Generate the skills section for system prompt
 */
export function renderSkillsSection(skills: SkillMetadata[]): string {
  if (skills.length === 0) {
    return '';
  }

  const skillsList = skills
    .map((skill) => `- **$${skill.name}**: ${skill.description}`)
    .join('\n');

  return `
# Skills

You have access to the following skills. Skills are reusable instruction bundles that provide specialized knowledge and procedures.

To invoke a skill, the user can mention it with the $skillName syntax (e.g., "$pdf-processing"). When a skill is invoked, its full instructions will be provided in a <skill> block.

You can also suggest relevant skills to the user based on their task, or use skills proactively when you recognize a task that matches a skill's description.

Available skills:
${skillsList}
`;
}
