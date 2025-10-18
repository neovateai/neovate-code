import { proxy } from 'valtio';
import { actions as chatActions } from '@/state/chat';
import type { CommandEntry, FileItem } from '@/types/chat';

interface SuggestionState {
  fileList: FileItem[];
  slashCommandList: CommandEntry[];
  loading: boolean;
}

export const state = proxy<SuggestionState>({
  fileList: [],
  slashCommandList: [],
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
  getFileList: async (query?: string) => {
    if (state.loading) {
      return;
    }

    state.loading = true;
    try {
      const items = await chatActions.getFiles({ query });
      state.fileList = items || [];
      state.loading = false;
    } catch (error) {
      state.loading = false;
      console.error('Failed to get file list:', error);
    }
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
      const filteredCommands = filterSlashCommands(
        slashCommands,
        searchString,
      ).filter((cmd) => cmd.command.type !== 'local-jsx');
      actions.setSlashCommandList(filteredCommands);
    } catch (error) {
      state.loading = false;
      console.error('Failed to get slash command list:', error);
    }
  },
};
