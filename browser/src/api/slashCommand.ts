import { request } from '@/utils/request';
import type { ApiResponse } from './model';

// Slash Command 类型定义
export interface SlashCommand {
  name: string;
  description: string;
  type: 'local' | 'local-jsx' | 'prompt';
}

export interface CategorizedCommands {
  builtin: SlashCommand[];
  user: SlashCommand[];
  project: SlashCommand[];
  plugin: SlashCommand[];
}

export interface SlashCommandsResponse {
  total: number;
  commands: SlashCommand[];
  categorized: CategorizedCommands;
}

export interface SlashCommandsQuery {
  search?: string;
}

// 获取所有slash commands
export const getSlashCommands = (
  query?: SlashCommandsQuery,
): Promise<ApiResponse<SlashCommandsResponse>> => {
  // 直接将 query 作为 params 传递给 request.get
  return request.get('/slash-commands', { params: query });
};
