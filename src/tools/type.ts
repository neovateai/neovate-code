import type { ToolResult } from '../tool';
import type { TodoItem } from './todo';

export type WriteToolResult = ToolResult<{
  filePath: string;
  relativeFilePath: string;
  oldContent: string | null;
  content: string;
  type: 'replace' | 'add';
}>;

export type EditToolResult = ToolResult<{
  filePath: string;
  relativeFilePath: string;
}>;

export type TodoReadToolResult = ToolResult<TodoItem[]>;

export type TodoWriteToolResult = ToolResult<{
  oldTodos: TodoItem[];
  newTodos: TodoItem[];
}>;

export type ReadToolResult = ToolResult<
  | {
      type: 'image';
      mimeType: string;
      content: string;
    }
  | {
      type: 'text';
      filePath: string;
      content: string;
      totalLines: number;
      offset: number;
      limit: number;
      actualLinesRead: number;
    }
>;

export type LsToolResult = ToolResult<string>;

export type GrepToolResult = ToolResult<{
  filenames: string[];
  durationMs: number;
  numFiles: number;
}>;

export type GlobToolResult = ToolResult<{
  filenames: string[];
  durationMs: number;
  numFiles: number;
  truncated: boolean;
}>;

export type FetchToolResult = ToolResult<{
  result: string;
  code: number;
  codeText: string;
  url: string;
  bytes: number;
  contentType: string;
  durationMs: number;
}>;

export type BashToolResult = ToolResult<string>;
