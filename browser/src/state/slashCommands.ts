import { proxy } from 'valtio';
import {
  type SlashCommandsQuery,
  getAllSlashCommands,
} from '@/api/slashCommands';
import type { CategorizedCommands, SlashCommand } from '@/api/slashCommands';

interface SlashCommandsState {
  commands: SlashCommand[];
  categorized: CategorizedCommands;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  loading: boolean;
  error: string | null;
  searchResults: SlashCommand[];
  searchError: string | null;
  lastSearchQuery: string;
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
  hasNextPage: false,
  hasPreviousPage: false,
  loading: false,
  error: null,
  searchResults: [],
  searchError: null,
  lastSearchQuery: '',
});

export const actions = {
  loadCommands: async (query?: SlashCommandsQuery) => {
    if (state.loading) {
      return;
    }

    state.loading = true;
    state.error = null;

    try {
      const response = await getAllSlashCommands(query);

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
    state.searchError = null;
    state.lastSearchQuery = searchText;

    try {
      const response = await getAllSlashCommands({
        ...query,
        search: searchText,
      });

      if (response.success && response.data) {
        actions.updateSlashCommandState(response.data);
      } else {
        state.searchError = 'Search failed';
      }
    } catch (error) {
      state.searchError =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Search slash commands failed:', error);
    } finally {
      state.loading = false;
    }
  },

  clearSearch: () => {
    state.searchResults = [];
    state.searchError = null;
    state.lastSearchQuery = '';
  },

  getByName(name: string): SlashCommand | undefined {
    return state.commands.find((cmd) => cmd.name === name);
  },

  getByCategory(category: keyof CategorizedCommands): readonly SlashCommand[] {
    return state.categorized[category] || [];
  },

  loadNextPage: async () => {
    if (state.hasNextPage && !state.loading) {
      await actions.loadCommands({
        page: state.page + 1,
        pageSize: state.pageSize,
      });
    }
  },

  loadPreviousPage: async () => {
    if (state.hasPreviousPage && !state.loading) {
      await actions.loadCommands({
        page: state.page - 1,
        pageSize: state.pageSize,
      });
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

  setPageSize: async (pageSize: number) => {
    if (pageSize !== state.pageSize) {
      await actions.loadCommands({
        page: 1,
        pageSize,
      });
    }
  },
};
