import { proxy } from 'valtio';
import { type SlashCommandsQuery, getSlashCommands } from '@/api/slashCommand';
import type { CategorizedCommands, SlashCommand } from '@/api/slashCommand';

interface SlashCommandsState {
  commands: SlashCommand[];
  categorized: CategorizedCommands;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  page: 1,
  pageSize: 50,
  totalPages: 0,
  loading: false,
  error: null,
});

export const actions = {
  loadCommands: async (query?: SlashCommandsQuery) => {
    if (state.loading) {
      return;
    }

    state.loading = true;
    state.error = null;

    try {
      const response = await getSlashCommands(query);

      if (response.success && response.data) {
        actions.updateSlashCommandState(response.data);
      } else {
        state.error = 'Failed to load slash commands';
      }
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      state.loading = false;
    }
  },

  updateSlashCommandState: (data: Partial<SlashCommandsState>) => {
    Object.assign(state, data);
  },

  searchWithTextQuery: async (
    searchText: string,
    query?: SlashCommandsQuery,
  ) => {
    state.loading = true;

    try {
      const response = await getSlashCommands({
        ...query,
        search: searchText,
      });

      if (response.success && response.data) {
        actions.updateSlashCommandState(response.data);
      } else {
        state.error = 'Search failed';
      }
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Search slash commands failed:', error);
    } finally {
      state.loading = false;
    }
  },

  loadPage: async (page: number) => {
    if (page >= 1 && page <= state.totalPages && !state.loading) {
      await actions.loadCommands({
        page,
        pageSize: state.pageSize,
      });
    }
  },
};
