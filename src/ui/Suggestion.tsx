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

interface SuggestionItemProps {
  name: string;
  description: string;
  isSelected: boolean;
  firstColumnWidth: number;
  maxWidth: number;
}

const MARGIN_LEFT = 2;
const SPACING = 1;
const ELLIPSIS_WIDTH = 3;
const MIN_DESC_WIDTH = 20;
const MIN_MAIN_DESC_WIDTH = 10;

export function SuggestionItem({
  name,
  description,
  isSelected,
  firstColumnWidth,
  maxWidth,
}: SuggestionItemProps) {
  // Calculate available width for description
  // Account for: margin + firstColumnWidth + spacing + ellipsis reserve
  const reservedWidth =
    MARGIN_LEFT + firstColumnWidth + SPACING + ELLIPSIS_WIDTH;
  const maxDescriptionWidth = Math.max(
    MIN_DESC_WIDTH,
    maxWidth - reservedWidth,
  );

  // Extract source suffix (content in the last parentheses, e.g., "(global)")
  const sourceMatch = description.match(/\(([^)]+)\)$/);
  const sourceSuffix = sourceMatch ? ` ${sourceMatch[0]}` : '';
  const mainDescription = sourceMatch
    ? description.slice(0, sourceMatch.index).trim()
    : description;

  // Truncate description if it exceeds max width, but preserve source suffix
  let truncatedDescription: string;
  if (description.length > maxDescriptionWidth) {
    const availableForMain =
      maxDescriptionWidth - sourceSuffix.length - ELLIPSIS_WIDTH; // Reserve space for "..." and source
    if (availableForMain > MIN_MAIN_DESC_WIDTH) {
      // If we have enough space, truncate main description and append source
      truncatedDescription = `${mainDescription.slice(0, availableForMain)}...${sourceSuffix}`;
    } else {
      // If space is too tight, just truncate everything
      truncatedDescription = `${description.slice(0, maxDescriptionWidth - ELLIPSIS_WIDTH)}...`;
    }
  } else {
    truncatedDescription = description;
  }

  return (
    <Box key={name} flexDirection="row">
      <Box width={firstColumnWidth}>
        <Text color={isSelected ? 'cyan' : 'gray'}>{name}</Text>
      </Box>
      {description && (
        <Text color="dim" dimColor>
          {truncatedDescription}
        </Text>
      )}
    </Box>
  );
}
