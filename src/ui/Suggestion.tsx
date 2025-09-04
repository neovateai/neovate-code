import { Box, Text } from 'ink';
import React from 'react';

interface SuggestionProps<T> {
  suggestions: T[];
  selectedIndex: number;
  maxVisible?: number;
  children: (
    suggestion: T,
    isSelected: boolean,
    visibleSuggestions: T[],
  ) => React.ReactNode;
}

const DEFAULT_MAX_VISIBLE = 10;

export function Suggestion<T>({
  suggestions,
  selectedIndex,
  maxVisible = DEFAULT_MAX_VISIBLE,
  children,
}: SuggestionProps<T>) {
  if (suggestions.length === 0) {
    return null;
  }
  const windowStart = Math.max(
    0,
    Math.min(selectedIndex - (maxVisible % 2), suggestions.length - maxVisible),
  );
  const windowEnd = Math.min(suggestions.length, windowStart + maxVisible);
  const visibleSuggestions = suggestions.slice(windowStart, windowEnd);
  const hasMoreAbove = windowStart > 0;
  const hasMoreBelow = windowEnd < suggestions.length;
  return (
    <Box flexDirection="column" marginLeft={2}>
      {visibleSuggestions.map((suggestion: T, index) => {
        const actualIndex = windowStart + index;
        const isSelected = actualIndex === selectedIndex;
        return (
          <React.Fragment key={index}>
            {children(suggestion, isSelected, visibleSuggestions)}
          </React.Fragment>
        );
      })}
    </Box>
  );
}

export function SuggestionItem({
  name,
  description,
  isSelected,
  firstColumnWidth,
}: {
  name: string;
  description: string;
  isSelected: boolean;
  firstColumnWidth: number;
}) {
  return (
    <Box key={name} flexDirection="row">
      <Box width={firstColumnWidth}>
        <Text color={isSelected ? 'cyan' : 'gray'}>{name}</Text>
      </Box>
      {description && (
        <Text color="dim" dimColor>
          {description}
        </Text>
      )}
    </Box>
  );
}
