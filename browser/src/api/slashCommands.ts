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

export interface SlashCommandSearchResponse {
  prefix: string;
  matches: SlashCommand[];
  count: number;
}

// 获取所有slash commands
export const getAllSlashCommands = (): Promise<
  ApiResponse<SlashCommandsResponse>
> => {
  return request.get('/slash-commands');
};

// 获取特定的slash command
export const getSlashCommand = (
  name: string,
): Promise<ApiResponse<SlashCommand>> => {
  return request.get(`/slash-commands/${encodeURIComponent(name)}`);
};

// 搜索slash commands
export const searchSlashCommands = (
  prefix: string,
): Promise<ApiResponse<SlashCommandSearchResponse>> => {
  return request.get(`/slash-commands/search/${encodeURIComponent(prefix)}`);
};
