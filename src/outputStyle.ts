import fm from 'front-matter';
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
        description: file.description + ' (user)',
        isCodingRelated: !!file.attributes.isCodingRelated,
        prompt: file.body,
      });
    });
  }

  loadProject(projectConfigDir: string): OutputStyle[] {
    return loadPolishedMarkdownFiles(projectConfigDir).map((file) => {
      return new OutputStyle({
        name: file.name,
        description: file.description + ' (project)',
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
    }
    return (
      this.outputStyles.find((style) => style.name === name) ||
      defaultOutputStyle
    );
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
  });
  return files.map((relativePath) => {
    const absPath = path.join(dir, relativePath);
    return loadPolishedMarkdownFile(absPath);
  });
}

function loadMarkdownFile(path: string): MarkdownFile {
  const content = fs.readFileSync(path, 'utf-8');
  const { attributes, body } = fm<Record<string, string>>(content);
  return {
    path,
    attributes,
    body,
  };
}

function loadPolishedMarkdownFile(filePath: string): NormalizedMarkdownFile {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Output style file not found: ${filePath}`);
  }
  const file = loadMarkdownFile(filePath);
  const name = path.basename(filePath, '.md');
  let description = file.attributes.description?.trim();
  if (!description) {
    const lines = file.body.split('\n');
    const firstLine = lines.find((line) => line.trim())?.trim();
    if (firstLine && /^[a-zA-Z]/.test(firstLine)) {
      description = firstLine;
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
