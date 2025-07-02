import { useEffect, useMemo, useState } from 'react';
import { SlashCommand } from '../../slash-commands/types';
import { useAppContext } from '../AppContext';

export interface SuggestionItem {
  name: string;
  description: string;
}

export interface AutoSuggestionState {
  suggestions: SuggestionItem[];
  selectedIndex: number;
  isVisible: boolean;
}

export function useAutoSuggestion(input: string) {
  const { services } = useAppContext();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [forceHidden, setForceHidden] = useState(false);

  const suggestions = useMemo(() => {
    if (!input.startsWith('/')) {
      return [];
    }

    const commandPrefix = input.slice(1);
    const registry = services.context.slashCommands;

    // If only "/" is typed, show all commands
    if (commandPrefix === '') {
      const allCommands = registry.getAll();
      return allCommands.map((cmd: SlashCommand) => ({
        name: cmd.name,
        description: cmd.description || '',
      }));
    }

    // Otherwise, filter by prefix
    const matchingCommands = registry.getMatchingCommands(commandPrefix);
    return matchingCommands.map((cmd: SlashCommand) => ({
      name: cmd.name,
      description: cmd.description || '',
    }));
  }, [input, services.context.slashCommands]);

  const isVisible =
    suggestions.length > 0 && input.startsWith('/') && !forceHidden;

  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  const navigateNext = () => {
    if (suggestions.length === 0) return;
    setSelectedIndex((prev) => (prev + 1) % suggestions.length);
  };

  const navigatePrevious = () => {
    if (suggestions.length === 0) return;
    setSelectedIndex(
      (prev) => (prev - 1 + suggestions.length) % suggestions.length,
    );
  };

  const getSelectedSuggestion = () => {
    if (
      suggestions.length === 0 ||
      selectedIndex < 0 ||
      selectedIndex >= suggestions.length
    ) {
      return null;
    }
    return suggestions[selectedIndex];
  };

  const getCompletedCommand = () => {
    const selected = getSelectedSuggestion();
    if (!selected) return input;

    const args = input.includes(' ') ? input.split(' ').slice(1).join(' ') : '';
    return `/${selected.name} ${args}`.trim() + ' ';
  };

  const setVisible = (visible: boolean) => {
    setForceHidden(!visible);
  };

  const resetVisible = () => {
    setForceHidden(false);
  };

  return {
    suggestions,
    selectedIndex,
    isVisible,
    navigateNext,
    navigatePrevious,
    getSelectedSuggestion,
    getCompletedCommand,
    setVisible,
    resetVisible,
  };
}
