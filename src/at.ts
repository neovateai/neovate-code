import type { AgentInputItem, UserMessageItem } from '@openai/agents';
import fs from 'fs';
import path from 'pathe';
import { IMAGE_EXTENSIONS } from './constants';

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
    for (const at of ats) {
      const filePath = path.resolve(this.cwd, at);
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
    if (files.length > 0) {
      return this.renderFilesToXml(files);
    }
    return null;
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

  static normalize(opts: {
    input: AgentInputItem[];
    cwd: string;
  }): AgentInputItem[] {
    const reversedInput = [...opts.input].reverse();
    const lastUserMessage = reversedInput.find((item) => {
      return 'role' in item && item.role === 'user';
    }) as UserMessageItem;
    if (lastUserMessage) {
      let userPrompt = lastUserMessage.content;
      if (Array.isArray(userPrompt)) {
        userPrompt =
          userPrompt[0]?.type === 'input_text' ? userPrompt[0].text : '';
      }
      const at = new At({
        userPrompt,
        cwd: opts.cwd,
      });
      const content = at.getContent();
      if (content) {
        if (Array.isArray(lastUserMessage.content)) {
          if (lastUserMessage.content[0]?.type === 'input_text') {
            lastUserMessage.content[0].text += `\n\n${content}`;
          }
        } else {
          lastUserMessage.content += `\n\n${content}`;
        }
        const input = reversedInput.reverse();
        return input;
      }
    }
    return opts.input;
  }
}
