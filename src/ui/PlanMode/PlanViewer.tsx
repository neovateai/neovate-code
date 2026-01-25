import { Box, Text } from 'ink';
import React, { useMemo } from 'react';
import { Markdown } from '../Markdown';
import { useAppStore } from '../store';

export interface PlanViewerProps {
  planContent: string;
  planFilePath: string;
  maxLines?: number;
}

export function PlanViewer({
  planContent,
  planFilePath,
  maxLines = 10,
}: PlanViewerProps) {
  const { transcriptMode } = useAppStore();

  // Calculate visible content with memoization
  const { visibleContent, hiddenLines, shouldTruncate } = useMemo(() => {
    const lines = planContent.split('\n');
    const totalLines = lines.length;
    const shouldTrunc = !transcriptMode && totalLines > maxLines;

    return {
      visibleContent: shouldTrunc
        ? lines.slice(0, maxLines).join('\n')
        : planContent,
      hiddenLines: shouldTrunc ? totalLines - maxLines : 0,
      shouldTruncate: shouldTrunc,
    };
  }, [planContent, transcriptMode, maxLines]);

  return (
    <Box flexDirection="column">
      {/* File path */}
      <Box paddingX={1}>
        <Text color="gray">File: {planFilePath}</Text>
      </Box>

      {/* Markdown content */}
      <Box paddingX={1} marginTop={1}>
        <Markdown>{visibleContent}</Markdown>
      </Box>

      {/* Truncation hint */}
      {shouldTruncate && (
        <Box paddingX={1} marginTop={1}>
          <Text color="gray" dimColor>
            ... {hiddenLines} more line{hiddenLines === 1 ? '' : 's'} hidden
            (Press ctrl+o to expand) ...
          </Text>
        </Box>
      )}
    </Box>
  );
}
