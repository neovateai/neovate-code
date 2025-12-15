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
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      paddingY={0}
    >
      {/* Commit Message Section */}
      <Box flexDirection="column">
        <Text bold color="cyan">
          📝 Commit Message
        </Text>
        <Box marginLeft={2}>
          <Text>{commitMessage}</Text>
        </Box>
      </Box>

      {/* Branch Name Section */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="cyan">
          🌿 Suggested Branch
        </Text>
        <Box marginLeft={2}>
          <Text color="green">{branchName}</Text>
        </Box>
      </Box>

      {/* Breaking Change Warning (conditional) */}
      {isBreakingChange && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="yellow">
            ⚠️ BREAKING CHANGE
          </Text>
          <Box marginLeft={2}>
            <Text color="yellow">
              This commit contains breaking changes that may affect existing
              functionality.
            </Text>
          </Box>
        </Box>
      )}

      {/* Summary Section */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="cyan">
          📋 Summary
        </Text>
        <Box marginLeft={2}>
          <Text dimColor>{summary}</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default CommitResultCard;
