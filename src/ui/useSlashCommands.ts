import { useEffect, useMemo, useRef, useState } from 'react';
import type { CommandEntry } from '../slashCommand';
import { useAppStore } from './store';
import { useListNavigation } from './useListNavigation';

export function useSlashCommands(input: string) {
  const { bridge, cwd, log } = useAppStore();
  const [slashCommands, setSlashCommands] = useState<CommandEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const suggestions = useMemo(() => {
    if (!input.startsWith('/') || input.includes('\n')) {
      return [];
    }
    const commandPrefix = input.slice(1);
    const onlySlash = commandPrefix === '';
    if (onlySlash) {
      return slashCommands;
    } else {
      return matchSlashCommands(commandPrefix, slashCommands);
    }
  }, [input, slashCommands]);

  // Calculate the maximum name width from suggestions
  const maxNameWidth = useMemo(() => {
    if (suggestions.length === 0) return 0;
    return Math.max(...suggestions.map((s) => s.command.name.length));
  }, [suggestions]);

  useEffect(() => {
    if (input !== '/') return;
    const start = Date.now();
    setIsLoading(true);
    bridge
      .request('slashCommand.list', { cwd })
      .then((res) => {
        setSlashCommands(res.data.slashCommands);
        setIsLoading(false);
        const end = Date.now();
        log(`getSlashCommands took ${end - start}ms`);
      })
      .catch((error) => {
        console.error('Failed to get slash commands:', error);
        setIsLoading(false);
      });
  }, [bridge, cwd, input, log]);

  // Use common list navigation logic
  const navigation = useListNavigation(suggestions);

  // Track suggestions length to reset selection when it changes
  const prevSuggestionsLengthRef = useRef(suggestions.length);
  useEffect(() => {
    if (prevSuggestionsLengthRef.current !== suggestions.length) {
      navigation.reset();
      prevSuggestionsLengthRef.current = suggestions.length;
    }
  });

  const getSelectedSuggestion = () => {
    return navigation.getSelected();
  };

  const getCompletedCommand = () => {
    const selected = getSelectedSuggestion();
    if (!selected) return input;
    // Handle slash command suggestions
    const args = input.includes(' ') ? input.split(' ').slice(1).join(' ') : '';
    return `${`/${selected.command.name} ${args}`.trim()} `;
  };

  return {
    suggestions,
    selectedIndex: navigation.selectedIndex,
    maxNameWidth,
    isLoading,
    navigateNext: navigation.navigateNext,
    navigatePrevious: navigation.navigatePrevious,
    getSelectedSuggestion,
    getCompletedCommand,
  };
}

function matchSlashCommands(
  prefix: string,
  slashCommands: CommandEntry[],
): CommandEntry[] {
  const lowerPrefix = prefix.toLowerCase().trim();
  return (
    slashCommands
      .filter((command) => {
        const nameMatch = command.command.name
          .toLowerCase()
          .startsWith(lowerPrefix);
        const descriptionMatch = command.command.description
          .toLowerCase()
          .includes(lowerPrefix);
        return nameMatch || descriptionMatch;
      })
      // name matches should come first
      .sort((a, b) => {
        const aNameMatch = a.command.name.toLowerCase().startsWith(lowerPrefix);
        const bNameMatch = b.command.name.toLowerCase().startsWith(lowerPrefix);
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return 0;
      })
  );
}
