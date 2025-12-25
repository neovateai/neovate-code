import { Box, Text } from 'ink';
import type { ToolResultPart, ToolResultPart2 } from '../../message';
import type { LogItem } from './utils';

// Helper to extract text from ToolResult
function extractResultText(
  resultPart: ToolResultPart | ToolResultPart2,
): string {
  const result = resultPart.result;
  if (!result) return '...';

  // 1. Try returnDisplay first for friendly output
  if (result.returnDisplay) {
    if (typeof result.returnDisplay === 'string') {
      return result.returnDisplay;
    }
    // Handle specific returnDisplay types if needed, or fallback to default
    // For now we assume string representation is handled by specific tools
    // or we might need to stringify some objects
    if ('type' in result.returnDisplay) {
      if (result.returnDisplay.type === 'todo_read') {
        return `Read ${result.returnDisplay.todos.length} todos`;
      }
      if (result.returnDisplay.type === 'todo_write') {
        return `Updated todos`;
      }
      if (result.returnDisplay.type === 'agent_result') {
        const stats = result.returnDisplay.stats;
        return `${result.returnDisplay.status} (${stats.toolCalls} tool uses · ${stats.tokens.input + stats.tokens.output} tokens)`;
      }
    }
  }

  // 2. Fallback to llmContent
  const content = result.llmContent;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => {
        if (p.type === 'text') return p.text;
        if (p.type === 'image') return '[Image]';
        return '';
      })
      .join(' ');
  }
  return '...';
}

function formatToolArgs(args: Record<string, unknown>): string {
  const values = Object.values(args);
  if (values.length === 0) return '';
  return values
    .map((v) => {
      if (v === undefined || v === null || v === '') {
        return '';
      }
      return JSON.stringify(v);
    })
    .join(', ');
}

interface LogItemRendererProps {
  item: LogItem;
}

export function LogItemRenderer({ item }: LogItemRendererProps) {
  // User message
  if (item.type === 'user') {
    return (
      <Box paddingLeft={1}>
        <Text color="gray">
          {'>'} {item.content}
        </Text>
      </Box>
    );
  }

  // Tool interaction
  if (item.type === 'tool') {
    const { toolUse, toolResult } = item;
    // Use the new formatter for arguments
    const args = toolUse.description || formatToolArgs(toolUse.input);
    const resultText = toolResult
      ? extractResultText(toolResult).trim()
      : '...';

    // Split result into lines to handle multiline output gracefully
    const resultLines = resultText.split('\n');
    const firstLine = resultLines[0];
    const hasMore = resultLines.length > 1;

    // Truncate first line if too long
    const displayResult =
      firstLine.length > 200
        ? `${firstLine.substring(0, 200)}...`
        : firstLine + (hasMore ? '...' : '');

    const isError = toolResult?.result?.isError;

    return (
      <Box flexDirection="column" paddingLeft={1}>
        <Box>
          <Text color="cyan" bold>
            {toolUse.name}
          </Text>
          <Text color="gray">({args})</Text>
        </Box>
        {toolResult && (
          <Box paddingLeft={2}>
            <Text color={isError ? 'red' : 'gray'}>{displayResult}</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Text message (Assistant thought/response)
  if (item.type === 'text') {
    const trimmedContent = item.content.trim();
    if (!trimmedContent) return null;

    return (
      <Box paddingLeft={1}>
        <Text color="gray"> {trimmedContent}</Text>
      </Box>
    );
  }

  return null;
}
