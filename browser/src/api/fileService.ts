import { request } from '@/utils/request';
import type { FileItem } from './model';

interface FileListResponse {
  success: boolean;
  data: {
    cwd: string;
    directory: string;
    items: FileItem[];
    files: string[];
    directories: string[];
    error?: string;
  };
}

export const getFileList = (): Promise<FileListResponse> => {
  return request.get('/files/list');
};
