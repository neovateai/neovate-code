import { Box, Text } from 'ink';
import { useTerminalSize } from './useTerminalSize';

/**
 * DashedDivider component that renders a dashed horizontal line
 * Similar to boxen's dashed border style
 */
export function DashedDivider() {
  const { columns } = useTerminalSize();

  // Use Unicode box drawing characters to create a dashed line effect
  // ╌ (U+254C) is a light dashed horizontal line character
  const dashedLine = '╌'.repeat(Math.max(0, columns));

  return (
    <Box>
      <Text color="gray" dimColor>
        {dashedLine}
      </Text>
    </Box>
  );
}
