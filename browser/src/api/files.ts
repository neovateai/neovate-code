import { request } from '@/utils/request';
import type { ApiResponse, FileItem } from './model';

interface FileListResponse {
  cwd: string;
  directory: string;
  items: FileItem[];
  files: string[];
  directories: string[];
  error?: string;
}

export const getFileList = (): Promise<ApiResponse<FileListResponse>> => {
  return request.get('/files/list');
};

interface FileEditResponse {
  message: string;
  filePath: string;
}

export const editFile = (
  filePath: string,
  content: string,
): Promise<ApiResponse<FileEditResponse>> => {
  return request.post('/files/edit', { filePath, content });
};
