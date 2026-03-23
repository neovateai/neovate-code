import { Box, Text } from 'ink';
import type React from 'react';
import { UI_COLORS } from './constants';
import { useTerminalSize } from './useTerminalSize';

interface DividerProps {
  char?: string;
  color?: string;
  dimColor?: boolean;
  width?: number;
}

export const Divider: React.FC<DividerProps> = ({
  char = '─',
  color = UI_COLORS.ASK_PRIMARY,
  dimColor = false,
  width,
}) => {
  const { columns } = useTerminalSize();
  const line = char.repeat(Math.max(0, width ?? columns));

  return (
    <Box>
      <Text color={color} dimColor={dimColor}>
        {line}
      </Text>
    </Box>
  );
};
