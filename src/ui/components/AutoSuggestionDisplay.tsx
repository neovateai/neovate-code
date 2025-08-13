import { Box, Text } from 'ink';
import React from 'react';
import { type SuggestionItem } from '../hooks/useAutoSuggestion';

interface AutoSuggestionDisplayProps {
  suggestions: SuggestionItem[];
  selectedIndex: number;
  isVisible: boolean;
  isFileMode?: boolean;
}

const MAX_VISIBLE_SUGGESTIONS = 10;

export function AutoSuggestionDisplay({
  suggestions,
  selectedIndex,
  isVisible,
  isFileMode = false,
}: AutoSuggestionDisplayProps) {
  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  // Calculate scrolling window
  const windowStart = Math.max(
    0,
    Math.min(selectedIndex - 5, suggestions.length - MAX_VISIBLE_SUGGESTIONS),
  );
  const windowEnd = Math.min(
    suggestions.length,
    windowStart + MAX_VISIBLE_SUGGESTIONS,
  );
  const visibleSuggestions = suggestions.slice(windowStart, windowEnd);

  const hasMoreAbove = windowStart > 0;
  const hasMoreBelow = windowEnd < suggestions.length;

  return (
    <Box flexDirection="column" marginLeft={2}>
      {hasMoreAbove && (
        <Text color="dim" dimColor>
          ↑ {windowStart} more above
        </Text>
      )}
      {visibleSuggestions.map((suggestion, index) => {
        const actualIndex = windowStart + index;
        const isSelected = actualIndex === selectedIndex;
        return (
          <Box key={suggestion.name} flexDirection="column">
            <Text
              color={isSelected ? 'cyan' : 'gray'}
              backgroundColor={isSelected ? 'gray' : undefined}
            >
              {isFileMode ? '' : '/'}
              {suggestion.name}
            </Text>
            {suggestion.description && (
              <Box marginLeft={2}>
                <Text color="dim" dimColor>
                  {suggestion.description}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}
      {hasMoreBelow && (
        <Text color="dim" dimColor>
          ↓ {suggestions.length - windowEnd} more below
        </Text>
      )}
      <Text color="dim" dimColor>
        Tab to select • Enter to select and execute • ↑↓ to scroll
      </Text>
    </Box>
  );
}
