import type { FolderResponse } from '@/components/FolderPicker/types';
import { request } from '@/utils/request';

export interface FolderListRequest {
  path: string;
}

export interface FolderListResponse {
  success: boolean;
  data: FolderResponse;
  message?: string;
}

export async function getFolderList(path: string): Promise<FolderListResponse> {
  return await request(`/folders/list?path=${encodeURIComponent(path)}`, {
    method: 'GET',
  });
}
