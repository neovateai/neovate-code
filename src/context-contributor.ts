import createDebug from 'debug';
import fs from 'fs';
import path from 'path';
import { getCodebaseContext } from './codebase';
import { Context } from './context';
import { createLSTool } from './tools/ls';

const debug = createDebug('takumi:context-contributor');

interface GetContentOpts {
  context: Context;
}

type GetContent = (opts: GetContentOpts) => Promise<string | null>;

export interface ContextContributor {
  name: string;
  getContent: GetContent;
}

export class GitStatusContributor implements ContextContributor {
  name = 'gitStatus';
  async getContent(opts: GetContentOpts) {
    return opts.context.git;
  }
}

export class IDEContributor implements ContextContributor {
  name = 'ide';
  async getContent(opts: GetContentOpts) {
    // disable ide for now
    // enable after clone a new vscode plugin
    if (opts.context.ide && process.env.IDE) {
      const workspaceFolders = await opts.context.ide.getWorkspaceFolders();
      const openEditors = await opts.context.ide.getOpenEditors();
      const currentSelection = await opts.context.ide.getCurrentSelection();
      debug('workspaceFolders', workspaceFolders);
      debug('openEditors', openEditors);
      debug('currentSelection', currentSelection);
      return JSON.stringify({
        IDEWorkspaceFolders: JSON.stringify(workspaceFolders),
        IDEOpenEditors: JSON.stringify(openEditors),
        IDECurrentSelection: JSON.stringify(currentSelection),
      });
    }
    return null;
  }
}

export class DirectoryStructureContributor implements ContextContributor {
  name = 'directoryStructure';
  async getContent(opts: GetContentOpts) {
    const LSTool = createLSTool(opts);
    return await LSTool.invoke(null as any, JSON.stringify({ dir_path: '.' }));
  }
}

export class CodeStyleContributor implements ContextContributor {
  name = 'codeStyle';
  async getContent(opts: GetContentOpts) {
    const styles: string[] = [];
    let currentDir = opts.context.cwd;

    while (currentDir !== path.parse(currentDir).root) {
      const stylePath = path.join(currentDir, `${opts.context.productName}.md`);
      debug('stylePath', stylePath);
      if (fs.existsSync(stylePath)) {
        styles.push(
          `Contents of ${stylePath}:\n${fs.readFileSync(stylePath, 'utf-8')}`,
        );
      }
      currentDir = path.dirname(currentDir);
    }
    if (styles.length === 0) {
      return null;
    }
    return `
  The codebase follows strict style guidelines shown below. All code changes must strictly adhere to these guidelines to maintain consistency and quality.

  ${styles.reverse().join('\n\n')}`;
  }
}

export class ReadmeContributor implements ContextContributor {
  name = 'readme';
  async getContent(opts: GetContentOpts) {
    const readmePath = path.join(opts.context.cwd, 'README.md');
    if (!fs.existsSync(readmePath)) {
      return null;
    }
    debug('readmePath', readmePath);
    return fs.readFileSync(readmePath, 'utf-8');
  }
}

export class CodebaseContributor implements ContextContributor {
  name = 'codebase';
  async getContent(opts: GetContentOpts) {
    const ats = opts.context.history
      .join(' ')
      .split(' ')
      .filter((p) => p.startsWith('@'))
      .map((p) => p.slice(1));
    const hasCodebase = ats.includes('codebase');
    debug('hasCodebase', hasCodebase);
    if (hasCodebase) {
      // TODO: support include
      return await getCodebaseContext({
        context: opts.context,
      });
    }
    return null;
  }
}

export class FilesContributor implements ContextContributor {
  name = 'files';
  async getContent(opts: GetContentOpts) {
    const ats = opts.context.history
      .join(' ')
      .split(' ')
      .filter((p) => {
        return p.startsWith('@') && p !== '@codebase';
      })
      .map((p) => p.slice(1));
    debug('ats', ats);
    const files: string[] = [];
    for (const at of ats) {
      const filePath = path.resolve(opts.context.cwd, at);
      if (fs.existsSync(filePath)) {
        if (fs.statSync(filePath).isFile()) {
          files.push(filePath);
        } else if (fs.statSync(filePath).isDirectory()) {
          const dirFiles = this.getAllFilesInDirectory(filePath);
          files.push(...dirFiles);
        } else {
          throw new Error(`${filePath} is not a file or directory`);
        }
      }
    }
    debug('files', files);
    if (files.length > 0) {
      return this.renderFilesToXml(files, opts.context);
    }
    return null;
  }

  renderFilesToXml(files: string[], context: Context): string {
    const fileContents = files
      .map(
        (fc) => `
      <file>
        <path>${path.relative(context.cwd, fc)}</path>
        <content><![CDATA[${fs.readFileSync(fc, 'utf-8')}]]></content>
      </file>`,
      )
      .join('');
    return `<files>This section contains the contents of the repository's files.\n${fileContents}\n</files>`;
  }

  getAllFilesInDirectory(dirPath: string): string[] {
    const files: string[] = [];
    const traverse = (currentPath: string) => {
      try {
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
          const itemPath = path.join(currentPath, item);
          const stat = fs.statSync(itemPath);
          if (stat.isFile()) {
            files.push(itemPath);
          } else if (stat.isDirectory()) {
            // Skip hidden directories and common ignore patterns
            if (
              !item.startsWith('.') &&
              !['node_modules', 'dist', 'build'].includes(item)
            ) {
              traverse(itemPath);
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
        console.warn(`Warning: Could not read directory ${currentPath}`);
      }
    };
    traverse(dirPath);
    return files;
  }
}
