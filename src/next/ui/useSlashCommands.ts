import { useEffect, useMemo, useState } from 'react';
import type { CommandEntry } from '../slashCommand';
import { useAppStore } from './store';

export function useSlashCommands(input: string) {
  const { bridge, cwd, log } = useAppStore();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [slashCommands, setSlashCommands] = useState<CommandEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const suggestions = useMemo(() => {
    if (!input.startsWith('/')) {
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

  useEffect(() => {
    if (input !== '/') return;
    const start = Date.now();
    setIsLoading(true);
    bridge.request('getSlashCommands', { cwd }).then((res) => {
      setSlashCommands(res.data.slashCommands);
      setIsLoading(false);
      const end = Date.now();
      log(`getSlashCommands took ${end - start}ms`);
    });
  }, [bridge, cwd, input]);

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
    // Handle slash command suggestions
    const args = input.includes(' ') ? input.split(' ').slice(1).join(' ') : '';
    return `/${selected.command.name} ${args}`.trim() + ' ';
  };

  return {
    suggestions,
    selectedIndex,
    isLoading,
    navigateNext,
    navigatePrevious,
    getSelectedSuggestion,
    getCompletedCommand,
  };
}

function matchSlashCommands(
  prefix: string,
  slashCommands: CommandEntry[],
): CommandEntry[] {
  const lowerPrefix = prefix.toLowerCase();
  return slashCommands.filter((command) => {
    const nameMatch = command.command.name
      .toLowerCase()
      .startsWith(lowerPrefix);
    const descriptionMatch = command.command.description
      .toLowerCase()
      .includes(lowerPrefix);
    return nameMatch || descriptionMatch;
  });
}
