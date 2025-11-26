import { request } from '@/utils/request';
import type { ApiResponse } from './model';

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
