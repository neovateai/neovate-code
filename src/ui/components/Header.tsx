import { Box, Text } from 'ink';
import React from 'react';

interface GeneralInfoPanelProps {
  generalInfo: Record<string, string>;
}

function GeneralInfoPanel({ generalInfo }: GeneralInfoPanelProps) {
  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      minWidth={64}
      flexDirection="column"
    >
      {Object.entries(generalInfo).map(([key, value], index) => (
        <Text key={index} dimColor>
          <Text color="blueBright">↳ </Text>
          {key}: <Text bold>{value}</Text>
        </Text>
      ))}
    </Box>
  );
}

interface HeaderProps {
  productName: string;
  version: string;
  generalInfo: Record<string, string>;
}

export function Header({ productName, version, generalInfo }: HeaderProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box flexDirection="row" gap={1}>
        <Text bold color="white">
          {productName}
        </Text>
        <Text color="gray">v{version}</Text>
      </Box>
      <Box marginTop={1}>
        <GeneralInfoPanel generalInfo={generalInfo} />
      </Box>
    </Box>
  );
}
