import degit from 'degit';
import fs from 'fs';
import os from 'os';
import path from 'pathe';
import type { Context } from './context';
import type { Paths } from './paths';
import { PluginHookType } from './plugin';
import { safeFrontMatter } from './utils/safeFrontMatter';

export enum SkillSource {
  Plugin = 'plugin',
  GlobalClaude = 'global-claude',
  Global = 'global',
  ProjectClaude = 'project-claude',
  Project = 'project',
}

export interface SkillMetadata {
  name: string;
  description: string;
  path: string;
  source: SkillSource;
}

export interface SkillError {
  path: string;
  message: string;
}

export interface SkillLoadOutcome {
  skills: SkillMetadata[];
  errors: SkillError[];
}

export interface AddSkillOptions {
  global?: boolean;
  overwrite?: boolean;
  name?: string;
  targetDir?: string;
}

export interface AddSkillResult {
  installed: SkillMetadata[];
  skipped: { name: string; reason: string }[];
  errors: SkillError[];
}

const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;

export interface SkillManagerOpts {
  context: Context;
}

export class SkillManager {
  private skillsMap: Map<string, SkillMetadata> = new Map();
  private errors: SkillError[] = [];
  private paths: Paths;
  private context: Context;

  constructor(opts: SkillManagerOpts) {
    this.context = opts.context;
    this.paths = opts.context.paths;
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

    const pluginSkills = await this.context.apply({
      hook: 'skill',
      args: [],
      memo: [],
      type: PluginHookType.SeriesMerge,
    });

    if (Array.isArray(pluginSkills)) {
      for (const skillPath of pluginSkills) {
        if (typeof skillPath !== 'string') {
          this.errors.push({
            path: String(skillPath),
            message: 'Invalid skill path type: expected string',
          });
          continue;
        }
        if (!fs.existsSync(skillPath)) {
          this.errors.push({
            path: skillPath,
            message: 'Skill file not found',
          });
          continue;
        }
        this.loadSkillFile(skillPath, SkillSource.Plugin);
      }
    }

    const globalClaudeDir = path.join(
      path.dirname(this.paths.globalConfigDir),
      '.claude',
      'skills',
    );
    this.loadSkillsFromDirectory(globalClaudeDir, SkillSource.GlobalClaude);

    const globalDir = path.join(this.paths.globalConfigDir, 'skills');
    this.loadSkillsFromDirectory(globalDir, SkillSource.Global);

    const projectClaudeDir = path.join(
      path.dirname(this.paths.projectConfigDir),
      '.claude',
      'skills',
    );
    this.loadSkillsFromDirectory(projectClaudeDir, SkillSource.ProjectClaude);

    const projectDir = path.join(this.paths.projectConfigDir, 'skills');
    this.loadSkillsFromDirectory(projectDir, SkillSource.Project);
  }

  private loadSkillsFromDirectory(
    skillsDir: string,
    source: SkillSource,
  ): void {
    if (!fs.existsSync(skillsDir)) {
      return;
    }

    try {
      const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
          if (fs.existsSync(skillPath)) {
            this.loadSkillFile(skillPath, source);
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

  private loadSkillFile(skillPath: string, source: SkillSource): void {
    try {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const parsed = this.parseSkillFile(content, skillPath);

      if (parsed) {
        this.skillsMap.set(parsed.name, { ...parsed, source });
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
  ): Omit<SkillMetadata, 'source'> | null {
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

  async addSkill(
    source: string,
    options: AddSkillOptions = {},
  ): Promise<AddSkillResult> {
    const {
      global: isGlobal = false,
      overwrite = false,
      name,
      targetDir,
    } = options;
    const result: AddSkillResult = {
      installed: [],
      skipped: [],
      errors: [],
    };

    const tempDir = path.join(os.tmpdir(), `neovate-skill-${Date.now()}`);

    try {
      const normalizedSource = this.normalizeSource(source);
      const emitter = degit(normalizedSource, { force: true });
      await emitter.clone(tempDir);

      const skillPaths = this.scanForSkills(tempDir);

      if (skillPaths.length === 0) {
        result.errors.push({
          path: source,
          message: 'No skills found (no SKILL.md files)',
        });
        return result;
      }

      if (name && skillPaths.length > 1) {
        throw new Error(
          'Cannot use --name when source contains multiple skills',
        );
      }

      const targetBaseDir = targetDir
        ? targetDir
        : isGlobal
          ? path.join(this.paths.globalConfigDir, 'skills')
          : path.join(this.paths.projectConfigDir, 'skills');

      fs.mkdirSync(targetBaseDir, { recursive: true });

      for (const skillPath of skillPaths) {
        const skillDir = path.dirname(skillPath);
        const isRootSkill = skillDir === tempDir;
        const folderName =
          name ||
          (isRootSkill
            ? this.extractFolderName(source)
            : path.basename(skillDir));
        const targetDir = path.join(targetBaseDir, folderName);

        const content = fs.readFileSync(skillPath, 'utf-8');
        const parsed = this.parseSkillFileForAdd(content, skillPath);

        if (!parsed) {
          result.errors.push({
            path: skillPath,
            message: 'Invalid skill file',
          });
          continue;
        }

        if (fs.existsSync(targetDir)) {
          if (!overwrite) {
            result.skipped.push({
              name: parsed.name,
              reason: 'already exists',
            });
            continue;
          }
          fs.rmSync(targetDir, { recursive: true });
        }

        this.copyDirectory(skillDir, targetDir);

        result.installed.push({
          name: parsed.name,
          description: parsed.description,
          path: path.join(targetDir, 'SKILL.md'),
          source: isGlobal ? SkillSource.Global : SkillSource.Project,
        });
      }

      await this.loadSkills();
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
    }

    return result;
  }

  private normalizeSource(source: string): string {
    let normalized = source;

    if (
      normalized.startsWith('https://github.com/') ||
      normalized.startsWith('http://github.com/')
    ) {
      normalized = normalized.replace(/^https?:\/\/github\.com\//, '');
      const treeMatch = normalized.match(
        /^([^/]+\/[^/]+)\/tree\/([^/]+)(?:\/(.+))?$/,
      );
      if (treeMatch) {
        const [, repo, branch, subpath] = treeMatch;
        normalized = subpath
          ? `${repo}/${subpath}#${branch}`
          : `${repo}#${branch}`;
      }
      return `github:${normalized}`;
    }

    if (
      !normalized.startsWith('github:') &&
      !normalized.startsWith('gitlab:') &&
      !normalized.startsWith('bitbucket:')
    ) {
      return `github:${normalized}`;
    }
    return normalized;
  }

  private extractFolderName(source: string): string {
    let normalized = source
      .replace(/^https?:\/\/github\.com\//, '')
      .replace(/^github:/, '')
      .replace(/^gitlab:/, '')
      .replace(/^bitbucket:/, '');

    const treeMatchWithPath = normalized.match(
      /^[^/]+\/[^/]+\/tree\/[^/]+\/(.+)$/,
    );
    if (treeMatchWithPath) {
      normalized = treeMatchWithPath[1];
    } else {
      const treeMatchBranchOnly = normalized.match(
        /^([^/]+)\/([^/]+)\/tree\/[^/]+$/,
      );
      if (treeMatchBranchOnly) {
        normalized = treeMatchBranchOnly[2];
      }
    }

    normalized = normalized.replace(/#.*$/, '');
    const lastSegment = normalized.split('/').filter(Boolean).pop();
    return lastSegment || 'skill';
  }

  private scanForSkills(dir: string): string[] {
    const skills: string[] = [];

    const rootSkill = path.join(dir, 'SKILL.md');
    if (fs.existsSync(rootSkill)) {
      skills.push(rootSkill);
      return skills;
    }

    const skillsDir = path.join(dir, 'skills');
    if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
      const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
          if (fs.existsSync(skillPath)) {
            skills.push(skillPath);
          }
        }
      }
      if (skills.length > 0) {
        return skills;
      }
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(dir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          skills.push(skillPath);
        }
      }
    }

    return skills;
  }

  private copyDirectory(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private parseSkillFileForAdd(
    content: string,
    skillPath: string,
  ): { name: string; description: string } | null {
    try {
      const { attributes } = safeFrontMatter<{
        name?: string;
        description?: string;
      }>(content, skillPath);

      if (!attributes.name || !attributes.description) {
        return null;
      }

      if (
        attributes.name.length > MAX_NAME_LENGTH ||
        attributes.name.includes('\n')
      ) {
        return null;
      }

      if (
        attributes.description.length > MAX_DESCRIPTION_LENGTH ||
        attributes.description.includes('\n')
      ) {
        return null;
      }

      return {
        name: attributes.name,
        description: attributes.description,
      };
    } catch {
      return null;
    }
  }

  async removeSkill(
    name: string,
    targetDir?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const skillsDir =
      targetDir || path.join(this.paths.projectConfigDir, 'skills');
    const skillDir = path.join(skillsDir, name);

    if (!fs.existsSync(skillDir)) {
      return { success: false, error: 'Skill not found' };
    }

    const skillPath = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      return { success: false, error: 'Invalid skill directory (no SKILL.md)' };
    }

    fs.rmSync(skillDir, { recursive: true });
    await this.loadSkills();
    return { success: true };
  }
}
