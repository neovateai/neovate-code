export interface IFetchToolResult {
  result?: string;
  code?: number;
  codeText?: string;
  contentType?: string;
  durationMs?: number;
}

export interface IBashToolResult {
  success?: boolean;
  message?: string;
}

export interface IGlobToolResult {
  filenames: string[];
  message?: string;
}

export interface IGrepToolResult {
  filenames: string[];
  durationMs?: number;
}

export interface IReadToolResult {
  success?: boolean;
  message?: string;
  data?: {
    type?: string;
    filePath?: string;
    content?: string;
    totalLines?: number;
    offset?: number;
    limit?: number;
    actualLinesRead?: number;
  };
}

export interface IReadToolArgs {
  file_path: string;
  offset?: number | null;
  limit?: number | null;
}
