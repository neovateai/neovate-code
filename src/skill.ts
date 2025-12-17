import fs from 'fs';
import path from 'pathe';
import type { Paths } from './paths';
import { safeFrontMatter } from './utils/safeFrontMatter';

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

const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;

const SKILL_MENTION_REGEX = /\$([a-zA-Z][a-zA-Z0-9_-]*)/g;

export interface SkillManagerOpts {
  paths: Paths;
}

export class SkillManager {
  private skillsMap: Map<string, SkillMetadata> = new Map();
  private errors: SkillError[] = [];
  private paths: Paths;

  constructor(opts: SkillManagerOpts) {
    this.paths = opts.paths;
  }

  getSkills(): SkillMetadata[] {
    return Array.from(this.skillsMap.values());
  }

  getSkill(name: string): SkillMetadata | undefined {
    return this.skillsMap.get(name);
  }

  getErrors(): SkillError[] {
    return this.errors;
  }

  async readSkillBody(skill: SkillMetadata): Promise<string> {
    try {
      const content = fs.readFileSync(skill.path, 'utf-8');
      const { body } = safeFrontMatter(content, skill.path);
      return body;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error reading skill';
      throw new Error(`Failed to read skill ${skill.name}: ${message}`);
    }
  }

  async loadSkills(): Promise<void> {
    this.skillsMap.clear();
    this.errors = [];

    const globalSkillsDir = path.join(this.paths.globalConfigDir, 'skills');
    this.loadSkillsFromDirectory(globalSkillsDir);

    const projectSkillsDir = path.join(this.paths.projectConfigDir, 'skills');
    this.loadSkillsFromDirectory(projectSkillsDir);
  }

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

  private loadSkillFile(skillPath: string): void {
    try {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const parsed = this.parseSkillFile(content, skillPath);

      if (parsed) {
        this.skillsMap.set(parsed.name, parsed);
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

  private parseSkillFile(
    content: string,
    skillPath: string,
  ): SkillMetadata | null {
    try {
      const { attributes } = safeFrontMatter<{
        name?: string;
        description?: string;
      }>(content, skillPath);

      if (!attributes.name) {
        this.errors.push({
          path: skillPath,
          message: 'Missing required field: name',
        });
        return null;
      }

      if (!attributes.description) {
        this.errors.push({
          path: skillPath,
          message: 'Missing required field: description',
        });
        return null;
      }

      if (attributes.name.length > MAX_NAME_LENGTH) {
        this.errors.push({
          path: skillPath,
          message: `Name exceeds maximum length of ${MAX_NAME_LENGTH} characters`,
        });
        return null;
      }

      if (attributes.name.includes('\n')) {
        this.errors.push({
          path: skillPath,
          message: 'Name must be a single line',
        });
        return null;
      }

      if (attributes.description.length > MAX_DESCRIPTION_LENGTH) {
        this.errors.push({
          path: skillPath,
          message: `Description exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`,
        });
        return null;
      }

      if (attributes.description.includes('\n')) {
        this.errors.push({
          path: skillPath,
          message: 'Description must be a single line',
        });
        return null;
      }

      return {
        name: attributes.name,
        description: attributes.description,
        path: skillPath,
      };
    } catch (error) {
      this.errors.push({
        path: skillPath,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to parse frontmatter',
      });
      return null;
    }
  }
}
