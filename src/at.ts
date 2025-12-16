import type { LanguageModelV2Prompt } from '@ai-sdk/provider';
import fs from 'fs';
import path from 'pathe';
import { IMAGE_EXTENSIONS } from './constants';
import { createFileTree, listDirectory, printTree } from './utils/list';

const MAX_LINE_LENGTH_TEXT_FILE = 2000;
const MAX_LINES_TO_READ = 2000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class At {
  private userPrompt: string;
  private cwd: string;
  constructor(opts: { userPrompt: string; cwd: string }) {
    this.userPrompt = opts.userPrompt;
    this.cwd = opts.cwd;
  }

  getContent() {
    const prompt = this.userPrompt || '';
    const ats = this.extractAtPaths(prompt);
    const files: string[] = [];
    const directories: string[] = [];

    // Step 1: Classify files vs directories
    for (const at of ats) {
      const filePath = path.resolve(this.cwd, at);
      if (fs.existsSync(filePath)) {
        if (fs.statSync(filePath).isFile()) {
          files.push(filePath);
        } else if (fs.statSync(filePath).isDirectory()) {
          directories.push(filePath);
        } else {
          throw new Error(`${filePath} is not a file or directory`);
        }
      }
    }

    // Step 2: Process separately and merge
    let result = '';
    if (files.length > 0) {
      result += this.renderFilesToXml(files);
    }
    if (directories.length > 0) {
      result += this.renderDirectoriesToTree(directories);
    }

    return result || null;
  }

  private extractAtPaths(prompt: string): string[] {
    const paths: string[] = [];
    const regex = /@("[^"]+"|(?:[^\\ ]|\\ )+)/g;
    let match: RegExpExecArray | null = regex.exec(prompt);
    while (match !== null) {
      let path = match[1];
      // Remove quotes if present
      if (path.startsWith('"') && path.endsWith('"')) {
        path = path.slice(1, -1);
      } else {
        // Unescape spaces
        path = path.replace(/\\ /g, ' ');
      }
      paths.push(path);
      match = regex.exec(prompt);
    }
    return [...new Set(paths)];
  }

  private renderDirectoriesToTree(directories: string[]): string {
    let treeOutput = '';

    for (const dir of directories) {
      try {
        // Get file list using existing utility
        const fileList = listDirectory(dir, this.cwd).sort();

        // Handle empty directories
        if (fileList.length === 0) {
          treeOutput += `\n<directory_structure path="${path.relative(this.cwd, dir)}">\n(Empty directory)\n</directory_structure>`;
          continue;
        }

        // Build and format tree
        const tree = createFileTree(fileList);
        const treeString = printTree(dir, tree);

        treeOutput += `\n<directory_structure path="${path.relative(this.cwd, dir)}">\n<!-- This is a directory listing. Content is not included. -->\n${treeString}\n</directory_structure>`;
      } catch (error) {
        // Handle permission errors gracefully
        treeOutput += `\n<directory_structure path="${path.relative(this.cwd, dir)}">\nError: Unable to read directory\n</directory_structure>`;
      }
    }

    return treeOutput;
  }

  renderFilesToXml(files: string[]): string {
    const processedFiles = files
      .filter((fc) => !IMAGE_EXTENSIONS.has(path.extname(fc).toLowerCase()))
      .map((fc) => {
        // Single file size limit cannot exceed 10MB
        const stat = fs.statSync(fc);
        if (stat.size > MAX_FILE_SIZE) {
          return {
            content: '// File too large to display',
            metadata: `File size: ${Math.round(stat.size / 1024 / 1024)}MB (skipped)`,
            file: fc,
          };
        }
        const content = fs.readFileSync(fc, 'utf-8');
        if (content === undefined || content === null) {
          throw new Error(`Failed to read file: ${fc}`);
        }
        const result = this.processFileContent(content);
        return {
          content: result.content,
          metadata: result.metadata,
          file: fc,
        };
      });

    const fileContents = processedFiles
      .map(
        (result) =>
          `
      <file>
        <path>${path.relative(this.cwd, result.file)}</path>
        <metadata>${result.metadata}</metadata>
        <content><![CDATA[${result.content}]]></content>
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
      } catch {
        // Skip directories that can't be read
        console.warn(`Warning: Could not read directory ${currentPath}`);
      }
    };
    traverse(dirPath);
    return files;
  }

  private truncateLine(line: string): string {
    if (line.length <= MAX_LINE_LENGTH_TEXT_FILE) {
      return line;
    }
    return line.substring(0, MAX_LINE_LENGTH_TEXT_FILE) + '... [truncated]';
  }

  private processFileContent(content: string): {
    content: string;
    metadata: string;
  } {
    const allLines = content.split(/\r?\n/);
    const totalLines = allLines.length;

    // If file doesn't exceed limit, process all lines
    if (totalLines <= MAX_LINES_TO_READ) {
      const processedLines = allLines.map((line) => this.truncateLine(line));
      return {
        content: processedLines.join('\n'),
        metadata: `Complete file (${totalLines} lines)`,
      };
    }

    // If file exceeds limit, only read first MAX_LINES_TO_READ lines
    const selectedLines = allLines.slice(0, MAX_LINES_TO_READ);
    const truncatedLines = selectedLines.map((line) => this.truncateLine(line));

    return {
      content: truncatedLines.join('\n'),
      metadata: `Showing first ${MAX_LINES_TO_READ} lines of ${totalLines} total lines`,
    };
  }

  static normalizeLanguageV2Prompt(opts: {
    input: LanguageModelV2Prompt;
    cwd: string;
  }): LanguageModelV2Prompt {
    const lastUserMessage = [...opts.input].reverse().find((item) => {
      return 'role' in item && item.role === 'user';
    });
    if (!lastUserMessage) {
      return opts.input;
    }
    const content = lastUserMessage.content;
    for (const item of content) {
      if (item.type === 'text') {
        const userPrompt = item.text;
        const at = new At({
          userPrompt,
          cwd: opts.cwd,
        });
        const content = at.getContent();
        if (content) {
          item.text += `\n\n${content}`;
        }
      }
    }
    return opts.input;
  }
}
