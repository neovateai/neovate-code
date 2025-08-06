import { Box, Text } from 'ink';
import React from 'react';
import { GeneralInfo } from '../../plugin';

interface GeneralInfoPanelProps {
  generalInfo: Record<string, string>;
}

function sortGeneralInfo(generalInfo: GeneralInfo) {
  return Object.entries(generalInfo).sort((a, b) => {
    if (typeof a[1] === 'string' && typeof b[1] === 'string') {
      return 0;
    }
    if (typeof a[1] === 'object' && a[1].enforce === 'pre') {
      return -1;
    }
    if (typeof b[1] === 'object' && b[1].enforce === 'pre') {
      return 1;
    }
    return 0;
  });
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
      {sortGeneralInfo(generalInfo).map(([key, value], index) => (
        <Text key={index} dimColor>
          <Text color="blueBright">↳ </Text>
          {key}:{' '}
          <Text bold>{typeof value === 'string' ? value : value.text}</Text>
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
