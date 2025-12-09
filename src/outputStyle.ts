import assert from 'assert';
import fs from 'fs';
import { glob } from 'glob';
import path from 'pathe';
import type { Context } from './context';
import {
  defaultOutputStyle,
  getBuiltinOutputStyles,
} from './output-style/builtin';
import type { Paths } from './paths';
import { PluginHookType } from './plugin';
import { safeFrontMatter } from './utils/safeFrontMatter';
import { kebabToTitleCase } from './utils/string';

export type OutputStyleOpts = {
  name: string;
  description: string;
  isCodingRelated: boolean;
  prompt: string;
};

export class OutputStyle {
  name: string;
  description: string;
  isCodingRelated: boolean;
  prompt: string;

  constructor(opts: OutputStyleOpts) {
    this.name = opts.name;
    this.description = opts.description;
    this.isCodingRelated = opts.isCodingRelated;
    this.prompt = opts.prompt;
  }

  isDefault(): boolean {
    return this.name === 'Default';
  }
}

export type OutputStyleManagerOpts = {
  paths: Paths;
  outputStyles: OutputStyle[];
};

export class OutputStyleManager {
  outputStyles: OutputStyle[] = [];
  constructor(opts: OutputStyleManagerOpts) {
    this.outputStyles = [...this.load(opts.paths), ...opts.outputStyles];
  }

  static async create(context: Context) {
    const outputStyles = await context.apply({
      hook: 'outputStyle',
      args: [],
      memo: [],
      type: PluginHookType.SeriesMerge,
    });
    return new OutputStyleManager({
      paths: context.paths,
      outputStyles,
    });
  }

  load(paths: Paths): OutputStyle[] {
    const builtin = getBuiltinOutputStyles().map((item) => {
      return new OutputStyle({
        name: item.name,
        description: item.description,
        isCodingRelated: item.isCodingRelated,
        prompt: item.prompt,
      });
    });
    const global = this.loadGlobal(
      path.join(paths.globalConfigDir, 'output-styles'),
    );
    const project = this.loadProject(
      path.join(paths.projectConfigDir, 'output-styles'),
    );
    return [...builtin, ...global, ...project];
  }

  loadGlobal(globalConfigDir: string): OutputStyle[] {
    return loadPolishedMarkdownFiles(globalConfigDir).map((file) => {
      return new OutputStyle({
        name: file.name,
        description: `${file.description} (user)`,
        isCodingRelated: !!file.attributes.isCodingRelated,
        prompt: file.body,
      });
    });
  }

  loadProject(projectConfigDir: string): OutputStyle[] {
    return loadPolishedMarkdownFiles(projectConfigDir).map((file) => {
      return new OutputStyle({
        name: file.name,
        description: `${file.description} (project)`,
        isCodingRelated: !!file.attributes.isCodingRelated,
        prompt: file.body,
      });
    });
  }

  // name support
  // 1) name of builtin and plugin extended output styles
  // 2) path to a file which defines an output style with markdown with frontmatter
  // 3) url to a file which defines an output style with markdown with frontmatter (TODO: support)
  getOutputStyle(name: string | undefined, cwd: string): OutputStyle {
    const defaultOutputStyle = this.getDefaultOutputStyle();
    if (!name) {
      return defaultOutputStyle;
    }
    // Check if name is a file path
    if (path.isAbsolute(name) || name.startsWith('.')) {
      if (!name.endsWith('.md')) {
        throw new Error('Output style file must be a .md file');
      }
      let filePath = name;
      if (!path.isAbsolute(name)) {
        filePath = path.resolve(cwd, name);
        // Validate against path traversal attacks
        if (!filePath.startsWith(path.resolve(cwd))) {
          throw new Error('Path traversal not allowed');
        }
      }
      const file = loadPolishedMarkdownFile(filePath);
      return new OutputStyle({
        name: file.name,
        description: file.description,
        isCodingRelated: !!file.attributes.isCodingRelated,
        prompt: file.body,
      });
    } else if (name.startsWith('{') && name.endsWith('}')) {
      let json = null;
      try {
        json = JSON.parse(name);
      } catch (error) {
        throw new Error(
          `Invalid JSON output style: ${error instanceof Error ? error.message : String(error)}, original: ${name}`,
        );
      }
      assert(json.prompt, 'prompt is required');
      return new OutputStyle({
        name: json.name || 'Custom',
        description: json.description || 'Custom',
        isCodingRelated: json.isCodingRelated,
        prompt: json.prompt,
      });
    } else if (name) {
      const outputStyle = this.outputStyles.find(
        (style) => style.name === name,
      );
      assert(outputStyle, `Output style ${name} not found`);
      return outputStyle;
    } else {
      return defaultOutputStyle;
    }
  }

  getDefaultOutputStyle(): OutputStyle {
    return new OutputStyle({
      name: defaultOutputStyle.name,
      description: defaultOutputStyle.description,
      isCodingRelated: defaultOutputStyle.isCodingRelated,
      prompt: defaultOutputStyle.prompt,
    });
  }
}

type MarkdownFile = {
  path: string;
  attributes: Record<string, string>;
  body: string;
};

export type NormalizedMarkdownFile = MarkdownFile & {
  description: string;
  name: string;
  relativePath: string;
};

export function loadPolishedMarkdownFiles(
  dir: string,
): NormalizedMarkdownFile[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files = glob.sync('**/*.md', {
    cwd: dir,
    follow: true,
  });
  return files.map((relativePath) => {
    const absPath = path.join(dir, relativePath);
    return loadPolishedMarkdownFile(absPath, dir);
  });
}

export function loadMarkdownFile(filePath: string): MarkdownFile {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { attributes, body } = safeFrontMatter<Record<string, string>>(
    content,
    filePath,
  );
  return {
    path: filePath,
    attributes,
    body,
  };
}

function loadPolishedMarkdownFile(
  filePath: string,
  dir?: string,
): NormalizedMarkdownFile {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Output style file not found: ${filePath}`);
  }

  let name = path.basename(filePath, '.md');
  const file = loadMarkdownFile(filePath);
  if (dir) {
    const relativePath = path.relative(dir, filePath);
    // Extract command name from relative path (remove .md extension and convert / to :)
    name = relativePath.replace(/\.md$/, '').replace(/[/\\]/g, ':');
  }
  let description = file.attributes.description?.trim();
  if (!description) {
    const lines = file.body.split('\n');
    const firstLine = lines.find((line) => line.trim())?.trim();
    if (firstLine) {
      // Handle title lines starting with # (supports multiple #)
      if (firstLine.startsWith('#')) {
        // Remove all # symbols and clean up
        description = firstLine.replace(/^#+\s*/, '').trim();
      } else {
        // Use directly for any other starting character (including ```, ##, *, -, etc.)
        description = firstLine;
      }

      // Limit length to 50 characters, truncate and add ellipsis if exceeds
      if (description.length > 50) {
        description = `${description.substring(0, 50)}...`;
      }
    }
  }
  if (!description) {
    description = kebabToTitleCase(name);
  }
  return {
    ...file,
    relativePath: filePath,
    name,
    description,
  };
}
