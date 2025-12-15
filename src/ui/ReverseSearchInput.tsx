import chalk from 'chalk';
import { Box, Text, useInput } from 'ink';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTerminalSize } from './useTerminalSize';

export type CursorAction = 'start' | 'end' | 'left' | 'right';

interface ReverseSearchInputProps {
  history: string[];
  onExit: (match: string, cursorAction?: CursorAction) => void;
  onCancel: () => void;
}

export function ReverseSearchInput({
  history,
  onExit,
  onCancel,
}: ReverseSearchInputProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorOffset, setCursorOffset] = useState(0);
  const { columns } = useTerminalSize();

  // Filter matches based on query (case-insensitive), most recent first
  const matches = useMemo(() => {
    if (query === '') {
      return [...history].reverse();
    }
    const lowerQuery = query.toLowerCase();
    return [...history]
      .reverse()
      .filter((item) => item.toLowerCase().includes(lowerQuery));
  }, [history, query]);

  // Track previous matches length to reset selection
  const prevMatchesLengthRef = useRef(matches.length);
  useEffect(() => {
    if (prevMatchesLengthRef.current !== matches.length) {
      setSelectedIndex(0);
      prevMatchesLengthRef.current = matches.length;
    }
  }, [matches.length]);

  // Current matched command
  const currentMatch = matches[selectedIndex] ?? '';

  // Navigate to next (older) match - Ctrl+R
  const navigateNext = useCallback(() => {
    if (matches.length > 0) {
      setSelectedIndex((prev) => (prev < matches.length - 1 ? prev + 1 : prev));
    }
  }, [matches.length]);

  // Navigate to previous (newer) match - Ctrl+S
  const navigatePrevious = useCallback(() => {
    if (matches.length > 0) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
  }, [matches.length]);

  // Handle keyboard input directly
  useInput((input, key) => {
    // Escape - cancel search
    if (key.escape) {
      onCancel();
      return;
    }

    // Enter or Tab - select current match
    if (key.return || key.tab) {
      onExit(currentMatch, 'end');
      return;
    }

    // Ctrl+R - cycle to next (older) match
    if (key.ctrl && input === 'r') {
      navigateNext();
      return;
    }

    // Ctrl+S - cycle to previous (newer) match
    if (key.ctrl && input === 's') {
      navigatePrevious();
      return;
    }

    // Ctrl+A - exit and move cursor to start
    if (key.ctrl && input === 'a') {
      onExit(currentMatch, 'start');
      return;
    }

    // Ctrl+E - exit and move cursor to end
    if (key.ctrl && input === 'e') {
      onExit(currentMatch, 'end');
      return;
    }

    // Ctrl+C - cancel
    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }

    // Arrow keys - exit and apply cursor movement
    if (key.leftArrow) {
      // If cursor can move left within query, do that
      if (cursorOffset > 0) {
        setCursorOffset((prev) => prev - 1);
      } else {
        // Otherwise exit with left action
        onExit(currentMatch, 'left');
      }
      return;
    }

    if (key.rightArrow) {
      // If cursor can move right within query, do that
      if (cursorOffset < query.length) {
        setCursorOffset((prev) => prev + 1);
      } else {
        // Otherwise exit with right action
        onExit(currentMatch, 'right');
      }
      return;
    }

    // Up/Down arrow - exit and apply action
    if (key.upArrow) {
      onExit(currentMatch, 'start');
      return;
    }
    if (key.downArrow) {
      onExit(currentMatch, 'end');
      return;
    }

    // Backspace / Delete key on Mac - delete character before cursor
    // Handles: key.backspace, Ctrl+H, \x7f (DEL char on Mac), \b (backspace char)
    // console.log('====backspace', key);
    if (
      key.delete ||
      (key.ctrl && input === 'h') ||
      input === '\x7f' ||
      input === '\b'
    ) {
      if (cursorOffset > 0) {
        setQuery(
          (prev) => prev.slice(0, cursorOffset - 1) + prev.slice(cursorOffset),
        );
        setCursorOffset((prev) => prev - 1);
      }
      return;
    }

    // Delete - delete character after cursor (also Ctrl+D and escape sequence \x1b[3~)
    if ((key.ctrl && input === 'd') || input === '\x1b[3~') {
      if (cursorOffset < query.length) {
        setQuery(
          (prev) => prev.slice(0, cursorOffset) + prev.slice(cursorOffset + 1),
        );
      }
      return;
    }

    // Ctrl+U - delete to start of line
    if (key.ctrl && input === 'u') {
      setQuery((prev) => prev.slice(cursorOffset));
      setCursorOffset(0);
      return;
    }

    // Ctrl+K - delete to end of line
    if (key.ctrl && input === 'k') {
      setQuery((prev) => prev.slice(0, cursorOffset));
      return;
    }

    // Regular character input - insert at cursor position
    if (input && !key.ctrl && !key.meta) {
      setQuery(
        (prev) =>
          prev.slice(0, cursorOffset) + input + prev.slice(cursorOffset),
      );
      setCursorOffset((prev) => prev + input.length);
    }
  });

  // Render the query with cursor
  const renderedQuery = useMemo(() => {
    if (query.length === 0) {
      // Empty query - show cursor
      return chalk.inverse(' ');
    }

    const beforeCursor = query.slice(0, cursorOffset);
    const atCursor = query[cursorOffset] || ' ';
    const afterCursor = query.slice(cursorOffset + 1);

    return beforeCursor + chalk.inverse(atCursor) + afterCursor;
  }, [query, cursorOffset]);

  // Calculate display width for matched command
  const prefixText = "(reverse-i-search)'";
  const suffixText = "': ";
  const prefixLength = prefixText.length + query.length + suffixText.length;
  const maxMatchWidth = Math.max(0, columns - prefixLength - 4);

  // Truncate match for display if needed
  const displayMatch = useMemo(() => {
    if (currentMatch.length <= maxMatchWidth) {
      return currentMatch;
    }
    return `...${currentMatch.slice(-(maxMatchWidth - 3))}`;
  }, [currentMatch, maxMatchWidth]);

  // Render match with highlighted query text
  const renderedMatch = useMemo(() => {
    if (!displayMatch || !query) {
      return displayMatch;
    }

    // Find match position (case-insensitive)
    const lowerMatch = displayMatch.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerMatch.indexOf(lowerQuery);

    if (matchIndex === -1) {
      return displayMatch;
    }

    // Split and highlight
    const before = displayMatch.slice(0, matchIndex);
    const matched = displayMatch.slice(matchIndex, matchIndex + query.length);
    const after = displayMatch.slice(matchIndex + query.length);

    return before + chalk.yellow(matched) + after;
  }, [displayMatch, query]);

  return (
    <Box flexDirection="row">
      <Text dimColor>{prefixText}</Text>
      <Text>{renderedQuery}</Text>
      <Text dimColor>{suffixText}</Text>
      <Text>{renderedMatch}</Text>
    </Box>
  );
}
