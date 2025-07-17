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
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  commands: SlashCommand[];
  categorized: CategorizedCommands;
}

export interface SlashCommandsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

// 获取所有slash commands
export const getSlashCommands = (
  query?: SlashCommandsQuery,
): Promise<ApiResponse<SlashCommandsResponse>> => {
  const params = new URLSearchParams();

  if (query?.page !== undefined) {
    params.append('page', query.page.toString());
  }
  if (query?.pageSize !== undefined) {
    params.append('pageSize', query.pageSize.toString());
  }
  if (query?.search !== undefined && query.search.trim()) {
    params.append('search', query.search.trim());
  }

  const queryString = params.toString();
  const url = queryString
    ? `/slash-commands?${queryString}`
    : '/slash-commands';

  return request.get(url);
};
