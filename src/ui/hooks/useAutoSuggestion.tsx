import { useEffect, useMemo, useState } from 'react';
import { type SlashCommand } from '../../slash-commands/types';
import { useAppContext } from '../AppContext';
import {
  extractFileQuery,
  useFileAutoSuggestion,
} from './useFileAutoSuggestion';

export interface SuggestionItem {
  name: string;
  description: string | undefined;
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

  // Get file suggestions
  const fileSuggestions = useFileAutoSuggestion(input);

  const suggestions = useMemo(() => {
    // Handle file suggestions for @ anywhere in input
    if (fileSuggestions.length > 0) {
      return fileSuggestions;
    }

    // Handle slash command suggestions for / prefix
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
  }, [input, services.context.slashCommands, fileSuggestions]);

  const fileQuery = extractFileQuery(input);
  const isVisible =
    suggestions.length > 0 &&
    (input.startsWith('/') || fileQuery.hasFileQuery) &&
    !forceHidden;

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

    // Handle file suggestions
    if (fileQuery.hasFileQuery) {
      const beforeAt = input.substring(0, fileQuery.startIndex);
      const afterAt = input.substring(
        fileQuery.startIndex + fileQuery.fullMatch.length,
      );
      return `${beforeAt}@${selected.name} ${afterAt}`.trim() + ' ';
    }

    // Handle slash command suggestions
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
