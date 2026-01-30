import type { LanguageModelV3Prompt } from '@ai-sdk/provider';
import fs from 'fs';
import path from 'pathe';
import { IMAGE_EXTENSIONS } from './constants';
import { createFileTree, listDirectory, printTree } from './utils/list';

const MAX_LINE_LENGTH_TEXT_FILE = 2000;
const MAX_LINES_TO_READ = 2000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface AtPath {
  path: string;
  lineRange?: {
    start: number; // 起始行号（包含）
    end?: number; // 结束行号（包含），undefined 表示只读取单行
  };
}

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
    const fileEntries: Array<{
      filePath: string;
      lineRange?: { start: number; end?: number };
    }> = [];
    const directories: string[] = [];

    // Step 1: Classify files vs directories
    for (const at of ats) {
      const filePath = path.resolve(this.cwd, at.path);
      if (fs.existsSync(filePath)) {
        if (fs.statSync(filePath).isFile()) {
          fileEntries.push({ filePath, lineRange: at.lineRange });
        } else if (fs.statSync(filePath).isDirectory()) {
          directories.push(filePath);
          const dirFiles = this.getAllFilesInDirectory(filePath);
          // For directories, don't apply line ranges
          for (const dirFile of dirFiles) {
            fileEntries.push({ filePath: dirFile });
          }
        } else {
          throw new Error(`${filePath} is not a file or directory`);
        }
      }
    }

    // Step 2: Process separately and merge
    let result = '';
    if (fileEntries.length > 0) {
      result += this.renderFilesToXml(fileEntries);
    }
    if (directories.length > 0) {
      result += this.renderDirectoriesToTree(directories);
    }

    return result || null;
  }

  private extractAtPaths(prompt: string): AtPath[] {
    const pathsMap = new Map<string, AtPath>();
    // Match @path or @"path" optionally followed by :lineRange
    // The unquoted group should not match ':' to allow line range parsing
    const regex =
      /@("(?<quoted>[^"]+)"|(?<unquoted>(?:[^\\ :]|\\ )+))(?::(?<lineRange>\d+(?:-\d+)?))?/g;
    let match: RegExpExecArray | null = regex.exec(prompt);
    while (match !== null) {
      const groups = match.groups;
      if (!groups) {
        match = regex.exec(prompt);
        continue;
      }

      let filePath = groups.quoted || groups.unquoted;
      // Unescape spaces for unquoted paths
      if (groups.unquoted) {
        filePath = filePath.replace(/\\ /g, ' ');
      }

      // Skip directories - only process files
      try {
        const absolutePath = path.resolve(this.cwd, filePath);
        if (
          fs.existsSync(absolutePath) &&
          fs.statSync(absolutePath).isDirectory()
        ) {
          match = regex.exec(prompt);
          continue;
        }
      } catch {
        // If we can't check (e.g., permissions), let it through
        // and handle the error later in getContent()
      }

      // Parse line range if present
      let lineRange: { start: number; end?: number } | undefined;
      if (groups.lineRange) {
        const rangeMatch = groups.lineRange.match(/^(\d+)(?:-(\d+))?$/);
        if (rangeMatch) {
          const start = Number.parseInt(rangeMatch[1], 10);
          const end = rangeMatch[2]
            ? Number.parseInt(rangeMatch[2], 10)
            : start;
          lineRange = { start, end };
        }
      }

      // Create unique key based on path and line range
      const key = `${filePath}:${lineRange ? `${lineRange.start}-${lineRange.end}` : 'all'}`;
      if (!pathsMap.has(key)) {
        pathsMap.set(key, { path: filePath, lineRange });
      }

      match = regex.exec(prompt);
    }
    return Array.from(pathsMap.values());
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

  renderFilesToXml(
    fileEntries: Array<{
      filePath: string;
      lineRange?: { start: number; end?: number };
    }>,
  ): string {
    const processedFiles = fileEntries
      .filter(
        (entry) =>
          !IMAGE_EXTENSIONS.has(path.extname(entry.filePath).toLowerCase()),
      )
      .map((entry) => {
        // Single file size limit cannot exceed 10MB
        const stat = fs.statSync(entry.filePath);
        if (stat.size > MAX_FILE_SIZE) {
          return {
            content: '// File too large to display',
            metadata: `File size: ${Math.round(stat.size / 1024 / 1024)}MB (skipped)`,
            file: entry.filePath,
          };
        }
        const content = fs.readFileSync(entry.filePath, 'utf-8');
        if (content === undefined || content === null) {
          throw new Error(`Failed to read file: ${entry.filePath}`);
        }
        const result = this.processFileContent(content, entry.lineRange);
        return {
          content: result.content,
          metadata: result.metadata,
          file: entry.filePath,
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

  private processFileContent(
    content: string,
    lineRange?: { start: number; end?: number },
  ): {
    content: string;
    metadata: string;
  } {
    const allLines = content.split(/\r?\n/);
    const totalLines = allLines.length;

    // Handle line range if specified
    if (lineRange) {
      const { start, end } = lineRange;

      // Validate line numbers
      if (start < 1 || (end !== undefined && end < start)) {
        return {
          content: '',
          metadata: 'Invalid line range',
        };
      }

      // Convert to 0-based indexing and clamp to file bounds
      const startIdx = Math.max(0, start - 1);
      const endIdx = Math.min(totalLines, end ?? start);

      // Extract the specified lines
      const selectedLines = allLines.slice(startIdx, endIdx);

      // Truncate long lines
      const processedLines = selectedLines.map((line) =>
        this.truncateLine(line),
      );

      const actualStart = startIdx + 1;
      const actualEnd = endIdx;
      const displayRange =
        actualStart === actualEnd
          ? `Line ${actualStart}`
          : `Lines ${actualStart}-${actualEnd}`;

      return {
        content: processedLines.join('\n'),
        metadata: `${displayRange} of ${totalLines} total lines`,
      };
    }

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
    input: LanguageModelV3Prompt;
    cwd: string;
  }): LanguageModelV3Prompt {
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
