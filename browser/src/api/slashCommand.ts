import { request } from '@/utils/request';
import type { ApiResponse, SlashCommandItem } from './model';

interface SlashCommandListResponse {
  commands: SlashCommandItem[];
}

export const getSlashCommandList = (): Promise<
  ApiResponse<SlashCommandListResponse>
> => {
  return request.get('/slash-commands/list');
};
