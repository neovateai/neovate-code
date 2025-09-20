import { proxy } from 'valtio';
import { type FileListQueries, getFileList } from '@/api/files';
import type { FileItem, SlashCommandItem } from '@/api/model';
import { getSlashCommandList } from '@/api/slashCommand';

interface SuggestionState {
  fileList: FileItem[];
  slashCommandList: SlashCommandItem[];
  fileMap: Map<string, FileItem>;
  loading: boolean;
}

export const state = proxy<SuggestionState>({
  fileList: [],
  slashCommandList: [],
  fileMap: new Map(),
  loading: false,
});

const filterSlashCommands = (
  commands: SlashCommandItem[],
  searchString?: string,
): SlashCommandItem[] => {
  if (!searchString || !searchString.trim()) {
    return commands;
  }

  const lowerSearch = searchString.toLowerCase().trim();
  return commands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lowerSearch) ||
      cmd.description.toLowerCase().includes(lowerSearch),
  );
};

export const actions = {
  setFileList: (value: FileItem[]) => {
    state.fileList = value;

    state.loading = false;
    value.forEach((file) => {
      state.fileMap.set(file.path, file);
    });
  },
  getFileList: async (queries?: FileListQueries) => {
    if (state.loading) {
      return;
    }

    state.loading = true;
    try {
      const response = await getFileList(queries);
      actions.setFileList(response.data.items || []);
    } catch (error) {
      state.loading = false;
      console.error('Failed to get file list:', error);
    }
  },
  getFileByPath: (path: string) => {
    return state.fileMap.get(path);
  },

  setSlashCommandList: (value: SlashCommandItem[]) => {
    state.slashCommandList = value;
    state.loading = false;
  },

  getSlashCommandList: async ({
    searchString,
  }: {
    searchString?: string;
  } = {}) => {
    if (state.loading) {
      return;
    }

    state.loading = true;
    try {
      const response = await getSlashCommandList();
      const allCommands = response.data.commands || [];

      const filteredCommands = filterSlashCommands(allCommands, searchString);
      actions.setSlashCommandList(filteredCommands);
    } catch (error) {
      state.loading = false;
      console.error('Failed to get slash command list:', error);
    }
  },
};
