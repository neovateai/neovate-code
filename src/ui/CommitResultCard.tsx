import { Box, Text } from 'ink';
import type React from 'react';

export interface CommitResultCardProps {
  commitMessage: string;
  branchName: string;
  isBreakingChange: boolean;
  summary: string;
}

export const CommitResultCard: React.FC<CommitResultCardProps> = ({
  commitMessage,
  branchName,
  isBreakingChange,
  summary,
}) => {
  return (
    <Box flexDirection="column">
      <Text>
        <Text dimColor>commit: </Text>
        <Text>{commitMessage}</Text>
      </Text>
      <Text>
        <Text dimColor>branch: </Text>
        <Text color="green">{branchName}</Text>
      </Text>
      {isBreakingChange && <Text color="yellow"> BREAKING CHANGE</Text>}
      <Text> </Text>
      <Text dimColor>{summary}</Text>
    </Box>
  );
};

export default CommitResultCard;
