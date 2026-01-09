import { Box, Text } from 'ink';
import React, { useMemo } from 'react';
import { symbols } from '../utils/symbols';
import { UI_COLORS } from './constants';
import { useAppStore } from './store';

interface ExpandableOutputProps {
  content: string;
  maxLines?: number;
  color?: string;
  isError?: boolean;
}

export function ExpandableOutput({
  content,
  maxLines = 5,
  color = UI_COLORS.TOOL_RESULT,
  isError = false,
}: ExpandableOutputProps) {
  const { transcriptMode } = useAppStore();

  const { visibleLines, hiddenCount, shouldTruncate } = useMemo(() => {
    const lines = content.split('\n');
    const shouldTruncate = !transcriptMode && lines.length > maxLines;

    if (!shouldTruncate) {
      return {
        visibleLines: lines,
        hiddenCount: 0,
        shouldTruncate: false,
      };
    }

    return {
      visibleLines: lines.slice(0, maxLines),
      hiddenCount: lines.length - maxLines,
      shouldTruncate: true,
    };
  }, [content, transcriptMode, maxLines]);

  const displayOutput = visibleLines.join('\n');

  return (
    <Box flexDirection="column">
      <Text color={isError ? UI_COLORS.ERROR : color}>
        {symbols.arrowDown} {displayOutput}
      </Text>
      {shouldTruncate && (
        <Text color="gray" dimColor>
          ... {hiddenCount} more line{hiddenCount === 1 ? '' : 's'} hidden
          (Press ctrl+o to expand) ...
        </Text>
      )}
    </Box>
  );
}
