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

export interface FileListQueries {
  searchString?: string;

  maxSize?: number;
}

export const getFileList = (
  queries?: FileListQueries,
): Promise<ApiResponse<FileListResponse>> => {
  return request.get('/files/list', {
    params: queries,
  });
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

interface FileReadResponse {
  content: string;
  filePath: string;
}

export const readFile = (
  filePath: string,
): Promise<ApiResponse<FileReadResponse>> => {
  return request.get('/files/read', { params: { filePath } });
};
