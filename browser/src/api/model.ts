export interface FileItem {
  path: string;
  type: 'file' | 'directory';
  name: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export interface AppData {
  productName: string;
  version: string;
  cwd: string;
  config: Record<string, any>;
}
