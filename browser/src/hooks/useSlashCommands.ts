import { useEffect, useState } from 'react';
import {
  type CategorizedCommands,
  type SlashCommand,
  getAllSlashCommands,
  searchSlashCommands,
} from '@/api/slashCommands';

interface UseSlashCommandsState {
  commands: SlashCommand[];
  categorized: CategorizedCommands;
  total: number;
  loading: boolean;
  error: string | null;
}

interface UseSlashCommandsReturn extends UseSlashCommandsState {
  refresh: () => Promise<void>;
  search: (prefix: string) => Promise<SlashCommand[]>;
  getByName: (name: string) => SlashCommand | undefined;
  getByCategory: (category: keyof CategorizedCommands) => SlashCommand[];
}

export const useSlashCommands = (autoLoad = true): UseSlashCommandsReturn => {
  const [state, setState] = useState<UseSlashCommandsState>({
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

  const loadCommands = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await getAllSlashCommands();

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          commands: response.data.commands,
          categorized: response.data.categorized,
          total: response.data.total,
          loading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Failed to load slash commands',
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  const search = async (prefix: string): Promise<SlashCommand[]> => {
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
  };

  const getByName = (name: string): SlashCommand | undefined => {
    return state.commands.find((cmd) => cmd.name === name);
  };

  const getByCategory = (
    category: keyof CategorizedCommands,
  ): SlashCommand[] => {
    return state.categorized[category] || [];
  };

  useEffect(() => {
    if (autoLoad) {
      loadCommands();
    }
  }, [autoLoad]);

  return {
    ...state,
    refresh: loadCommands,
    search,
    getByName,
    getByCategory,
  };
};
