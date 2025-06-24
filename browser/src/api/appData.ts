import { request } from '@/utils/request';
import type { ApiResponse, AppData } from './model';

export const getAppData = (): Promise<ApiResponse<AppData>> => {
  return request.get('/app-data');
};
