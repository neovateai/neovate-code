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

function getCharDisplayWidth(code: number): number {
  if (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0x303e) ||
    (code >= 0x3040 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe1f) ||
    (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1b000 && code <= 0x1b77f) ||
    (code >= 0x1f300 && code <= 0x1f64f) ||
    (code >= 0x1f900 && code <= 0x1f9ff) ||
    (code >= 0x20000 && code <= 0x2a6df) ||
    (code >= 0x2a700 && code <= 0x2ceaf) ||
    (code >= 0x2ceb0 && code <= 0x2ebef) ||
    (code >= 0x30000 && code <= 0x3134f)
  ) {
    return 2;
  }
  return 1;
}

function getStringDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0) ?? 0;
    width += getCharDisplayWidth(code);
  }
  return width;
}

function truncateToDisplayWidth(str: string, maxWidth: number): string {
  let width = 0;
  let i = 0;
  for (const char of str) {
    const code = char.codePointAt(0) ?? 0;
    const charWidth = getCharDisplayWidth(code);
    if (width + charWidth > maxWidth) break;
    width += charWidth;
    i += char.length;
  }
  return str.slice(0, i);
}

export function SuggestionItem({
  name,
  description,
  isSelected,
  firstColumnWidth,
  maxWidth,
}: SuggestionItemProps) {
  const reservedWidth =
    MARGIN_LEFT + firstColumnWidth + SPACING + ELLIPSIS_WIDTH;
  const maxDescriptionWidth = Math.max(
    MIN_DESC_WIDTH,
    maxWidth - reservedWidth,
  );

  const sourceMatch = description.match(/\(([^)]+)\)$/);
  const sourceSuffix = sourceMatch ? ` ${sourceMatch[0]}` : '';
  const mainDescription = sourceMatch
    ? description.slice(0, sourceMatch.index).trim()
    : description;

  let truncatedDescription: string;
  const descDisplayWidth = getStringDisplayWidth(description);
  if (descDisplayWidth > maxDescriptionWidth) {
    const sourceSuffixWidth = getStringDisplayWidth(sourceSuffix);
    const availableForMain =
      maxDescriptionWidth - sourceSuffixWidth - ELLIPSIS_WIDTH;
    if (availableForMain > MIN_MAIN_DESC_WIDTH) {
      truncatedDescription = `${truncateToDisplayWidth(mainDescription, availableForMain)}...${sourceSuffix}`;
    } else {
      truncatedDescription = `${truncateToDisplayWidth(description, maxDescriptionWidth - ELLIPSIS_WIDTH)}...`;
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
