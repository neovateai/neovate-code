import type { TodoItem } from './todo';

type BaseToolResult<T> = BaseToolSuccessResult<T> | BaseToolErrorResult;

type BaseToolSuccessResult<T> = {
  success: true;
  message: string;
  data: T;
};

type BaseToolErrorResult = {
  success: false;
  error: string;
};

export type WriteToolResult = BaseToolResult<{
  filePath: string;
  relativeFilePath: string;
  oldContent: string | null;
  content: string;
  type: 'replace' | 'add';
}>;

export type EditToolResult = BaseToolResult<{
  filePath: string;
  relativeFilePath: string;
}>;

export type TodoReadToolResult = BaseToolResult<TodoItem[]>;

export type TodoWriteToolResult = BaseToolResult<{
  oldTodos: TodoItem[];
  newTodos: TodoItem[];
}>;

export type ReadToolResult = BaseToolResult<
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

export type LsToolResult = BaseToolResult<string>;

export type GrepToolResult = BaseToolResult<{
  filenames: string[];
  durationMs: number;
  numFiles: number;
}>;

export type GlobToolResult = BaseToolResult<{
  filenames: string[];
  durationMs: number;
  numFiles: number;
  truncated: boolean;
}>;

export type FetchToolResult = BaseToolResult<{
  result: string;
  code: number;
  codeText: string;
  url: string;
  bytes: number;
  contentType: string;
  durationMs: number;
}>;

export type BashToolResult = BaseToolResult<string>;
