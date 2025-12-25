import { Box, Text } from 'ink';

/**
 * Indicator shown when in transcript mode
 * Replaces ChatInput to provide read-only view
 */
export function TranscriptModeIndicator() {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        borderStyle="single"
        borderColor="gray"
        borderTop={true}
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
      />
      <Box>
        <Text dimColor>
          {'  '}
          Showing detailed transcript · ctrl+o to toggle
        </Text>
      </Box>
    </Box>
  );
}
