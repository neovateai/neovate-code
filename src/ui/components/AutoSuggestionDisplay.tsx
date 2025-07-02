import { Box, Text } from 'ink';
import React from 'react';
import { SuggestionItem } from '../hooks/useAutoSuggestion';

interface AutoSuggestionDisplayProps {
  suggestions: SuggestionItem[];
  selectedIndex: number;
  isVisible: boolean;
}

const MAX_VISIBLE_SUGGESTIONS = 5;

export function AutoSuggestionDisplay({
  suggestions,
  selectedIndex,
  isVisible,
}: AutoSuggestionDisplayProps) {
  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  const visibleSuggestions = suggestions.slice(0, MAX_VISIBLE_SUGGESTIONS);
  const hasMore = suggestions.length > MAX_VISIBLE_SUGGESTIONS;

  return (
    <Box flexDirection="column" marginLeft={2}>
      {visibleSuggestions.map((suggestion, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={suggestion.name} flexDirection="row">
            <Text
              color={isSelected ? 'cyan' : 'gray'}
              backgroundColor={isSelected ? 'gray' : undefined}
            >
              /{suggestion.name}
            </Text>
            {suggestion.description && (
              <Text color="dim" dimColor>
                {' '}
                - {suggestion.description}
              </Text>
            )}
          </Box>
        );
      })}
      {hasMore && (
        <Text color="dim" dimColor>
          ... and {suggestions.length - MAX_VISIBLE_SUGGESTIONS} more
        </Text>
      )}
      <Text color="dim" dimColor>
        Tab to navigate • Enter to select
      </Text>
    </Box>
  );
}
