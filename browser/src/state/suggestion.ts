import { proxy } from 'valtio';
import { type FileListQueries, getFileList } from '@/api/files';
import type { FileItem } from '@/api/model';
import { actions as chatActions } from '@/state/chat';
import type { CommandEntry } from '@/types/chat';

interface SuggestionState {
  fileList: FileItem[];
  slashCommandList: CommandEntry[];
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
  commands: CommandEntry[],
  searchString?: string,
): CommandEntry[] => {
  if (!searchString || !searchString.trim()) {
    return commands;
  }

  const lowerSearch = searchString.toLowerCase().trim();
  return commands.filter(
    (cmd) =>
      cmd.command.name.toLowerCase().includes(lowerSearch) ||
      cmd.command.description.toLowerCase().includes(lowerSearch),
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

  setSlashCommandList: (value: CommandEntry[]) => {
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
      const slashCommands = await chatActions.getSlashCommands();
      const filteredCommands = filterSlashCommands(slashCommands, searchString);
      // TODO: 过滤掉 jsx 类型的命令
      actions.setSlashCommandList(filteredCommands);
    } catch (error) {
      state.loading = false;
      console.error('Failed to get slash command list:', error);
    }
  },
};
