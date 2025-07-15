import { proxy } from 'valtio';
import { getAllSlashCommands, searchSlashCommands } from '@/api/slashCommands';
import type { CategorizedCommands, SlashCommand } from '@/api/slashCommands';

interface SlashCommandsState {
  commands: SlashCommand[];
  categorized: CategorizedCommands;
  total: number;
  loading: boolean;
  error: string | null;
}

export const state = proxy<SlashCommandsState>({
  commands: [],
  categorized: {
    builtin: [],
    user: [],
    project: [],
    plugin: [],
  },
  total: 0,
  loading: false,
  error: null,
});

export const actions = {
  loadCommands: async () => {
    if (state.loading || state.total > 0) {
      return;
    }
    state.loading = true;
    state.error = null;

    try {
      const response = await getAllSlashCommands();

      if (response.success && response.data) {
        state.commands = response.data.commands;
        state.categorized = response.data.categorized;
        state.total = response.data.total;
      } else {
        state.error = 'Failed to load slash commands';
      }
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      state.loading = false;
    }
  },

  search: async (prefix: string): Promise<SlashCommand[]> => {
    try {
      const response = await searchSlashCommands(prefix);
      if (response.success && response.data) {
        return response.data.matches;
      }
      return [];
    } catch (error) {
      console.error('Search slash commands failed:', error);
      return [];
    }
  },

  getByName(name: string): SlashCommand | undefined {
    return state.commands.find((cmd) => cmd.name === name);
  },

  getByCategory(category: keyof CategorizedCommands): readonly SlashCommand[] {
    return state.categorized[category] || [];
  },
};
