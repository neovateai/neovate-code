export interface FileItem {
  path: string;
  type: 'file' | 'directory';
  name: string;
}

export interface ImageItem {
  /** URL or base64 string */
  src: string;
  mime: string;
}

export interface SlashCommandItem {
  name: string;
  description: string;
  path: string;
  type: 'project' | 'global';
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
