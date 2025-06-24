export interface IFetchToolResult {
  result?: string;
  code?: number;
  codeText?: string;
  contentType?: string;
  durationMs?: number;
}

export interface IBashToolResult {
  stdout?: string;
  stderr?: string;
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
  totalLines?: number;
}
