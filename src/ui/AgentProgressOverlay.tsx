import { Box, Text } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import type {
  AssistantMessage,
  NormalizedMessage,
  TextPart,
  ToolResultPart2,
  ToolUsePart,
} from '../message';
import { UI_COLORS } from './constants';
import { GradientText } from './GradientText';
import { useAppStore } from './store';
import { useTextGradientAnimation } from './useTextGradientAnimation';

/**
 * Container component that displays all running SubAgents
 * Completely independent from Messages, similar to BackgroundPrompt
 */
export function AgentProgressOverlay() {
  const agentProgressMap = useAppStore((state) => state.agentProgressMap);

  // Filter running agents and sort by start time
  const runningAgents = useMemo(() => {
    return Object.values(agentProgressMap)
      .filter((progress) => progress.status === 'running')
      .sort((a, b) => a.startTime - b.startTime);
  }, [agentProgressMap]);

  // Don't render anything if no agents are running
  if (runningAgents.length === 0) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Progress list */}
      <Box flexDirection="column">
        {runningAgents.map((agent, index) => {
          return (
            <Box key={agent.agentId} flexDirection="column" marginTop={0}>
              <AgentProgressItem
                agentId={agent.agentId}
                agentType={agent.agentType}
                isLast={true}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

interface AgentProgressItemProps {
  agentId: string;
  agentType?: string;
  isLast: boolean;
}

/**
 * Component to display real-time progress of a single SubAgent
 * Shows a boxed progress with stats and expandable message history
 */
export function AgentProgressItem({
  agentId,
  agentType,
  isLast,
}: AgentProgressItemProps) {
  const progress = useAppStore((state) => state.agentProgressMap[agentId]);
  const [expanded, setExpanded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Track elapsed time
  useEffect(() => {
    if (!progress) return;

    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - progress.lastUpdate) / 1000);
      setElapsedSeconds(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [progress?.lastUpdate]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!progress || progress.messages.length === 0) {
      return { toolCalls: 0, tokens: 0 };
    }

    const toolCalls = progress.messages.filter((msg) => {
      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        return msg.content.some((p) => p.type === 'tool_use');
      }
      return false;
    }).length;

    const tokens = progress.messages.reduce((sum, msg) => {
      if (msg.role === 'assistant' && 'usage' in msg) {
        const usage = (msg as AssistantMessage).usage;
        return sum + (usage?.input_tokens || 0) + (usage?.output_tokens || 0);
      }
      return sum;
    }, 0);

    return { toolCalls, tokens };
  }, [progress]);

  const taskDescription = useMemo(() => {
    if (!progress || progress.messages.length === 0) return '';
    const firstMsg = progress.messages[0];
    if (firstMsg.role === 'user') {
      const content =
        typeof firstMsg.content === 'string'
          ? firstMsg.content
          : (
              firstMsg.content.find((p) => p.type === 'text') as
                | TextPart
                | undefined
            )?.text || '';
      // Get first line or first 30 chars
      const firstLine = content.split('\n')[0];
      const summary =
        firstLine.length > 30 ? `${firstLine.slice(0, 30)}...` : firstLine;
      return summary;
    }
    return '';
  }, [progress]);

  const latestActivity = useMemo(() => {
    if (!progress || progress.messages.length === 0) return null;
    const msgs = progress.messages;

    // Search backwards for the last tool use
    for (let i = msgs.length - 1; i >= 0; i--) {
      const msg = msgs[i];
      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        const toolUse = msg.content.find(
          (p) => p.type === 'tool_use',
        ) as ToolUsePart;
        if (toolUse) {
          // Check if there is a result for this tool use
          const resultMsg = msgs.find(
            (m, index) =>
              index > i &&
              m.role === 'tool' &&
              Array.isArray(m.content) &&
              m.content.some(
                (p) => p.type === 'tool-result' && p.toolCallId === toolUse.id,
              ),
          );

          let resultPart: ToolResultPart2 | undefined;
          if (resultMsg && Array.isArray(resultMsg.content)) {
            resultPart = resultMsg.content.find(
              (p) => p.type === 'tool-result' && p.toolCallId === toolUse.id,
            ) as ToolResultPart2;
          }

          return { toolUse, result: resultPart };
        }
      }
    }
    return null;
  }, [progress]);

  const progressText = useMemo(() => {
    const typeLabel = agentType
      ? `${agentType.charAt(0).toUpperCase() + agentType.slice(1)}`
      : 'Agent';
    return `${typeLabel}(${taskDescription})`;
  }, [agentType, taskDescription]);

  const highlightIndex = useTextGradientAnimation(
    progressText,
    progress !== undefined,
  );

  if (!progress) {
    return (
      <Text color={UI_COLORS.ACTIVITY_INDICATOR_TEXT} dimColor>
        Initializing...
      </Text>
    );
  }

  // Approximation of hidden tool uses (assuming 2 messages per tool use pair)
  const hiddenToolUses = Math.max(0, stats.toolCalls - 1);

  return (
    <Box flexDirection="column" width="100%">
      {/* Header Line */}
      <Box>
        <Text color="white" bold>
          {progressText}
        </Text>
      </Box>

      {/* Content box */}
      <Box flexDirection="column" paddingLeft={1}>
        {/* Expanded View */}
        {expanded ? (
          <Box flexDirection="column">
            {progress.messages.map((msg, idx) => (
              <NestedAgentMessage
                key={idx}
                message={msg}
                isLast={idx === progress.messages.length - 1}
              />
            ))}
            <Box marginTop={0}>
              <Text color="gray" dimColor>
                (ctrl+o to collapse)
              </Text>
            </Box>
          </Box>
        ) : (
          /* Collapsed View */
          <Box flexDirection="column">
            {latestActivity ? (
              <Box flexDirection="column">
                {/* Tool Use Line */}
                <Box>
                  <Text color="gray">└ </Text>
                  <Text color="white" bold>
                    {formatToolUse(latestActivity.toolUse)}
                  </Text>
                </Box>
                {/* Tool Result Line (if exists) */}
                {latestActivity.result ? (
                  <Box marginLeft={2}>
                    <Text color="gray">
                      {formatToolResult(latestActivity.result)}
                    </Text>
                  </Box>
                ) : (
                  // Show "Running..." if no result yet
                  <Box marginLeft={2}>
                    <Text color="gray" dimColor>
                      Running...
                    </Text>
                  </Box>
                )}
              </Box>
            ) : (
              <Box>
                <Text color="gray">└ Starting...</Text>
              </Box>
            )}

            {/* Footer / More info */}
            <Box marginTop={0}>
              {hiddenToolUses > 0 && (
                <Text color="gray" dimColor>
                  +{hiddenToolUses} more tool uses{' '}
                </Text>
              )}
              <Text color="gray" dimColor>
                (ctrl+o to expand)
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export function formatToolUse(toolUse: ToolUsePart): string {
  const name = toolUse.name;
  const args = toolUse.input;
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  if (name === 'read') {
    const paths =
      args.paths ||
      (args.file_path ? [args.file_path] : args.path ? [args.path] : []);
    const pathStr = paths.length > 0 ? paths.join(', ') : '';
    const displayPath =
      pathStr.length > 40 ? `...${pathStr.slice(-37)}` : pathStr;
    return `Read(${displayPath})`;
  }

  if (name === 'bash') {
    const cmd = args.command || '';
    const displayCmd = cmd.length > 40 ? `${cmd.slice(0, 37)}...` : cmd;
    return `Bash(${displayCmd})`;
  }

  if (name === 'grep') {
    return `Grep(${args.pattern || ''})`;
  }

  if (name === 'glob') {
    return `Glob(${args.pattern || ''})`;
  }

  if (name === 'ls') {
    return `Ls(${args.path || ''})`;
  }

  if (name === 'fetch') {
    return `Fetch(${args.url || ''})`;
  }

  if (name === 'write') {
    return `Write(${args.path || ''})`;
  }

  if (name === 'edit') {
    return `Edit(${args.path || ''})`;
  }

  if (name === 'task') {
    return `Task(${args.subagent_type || ''})`;
  }

  return `${capitalize(name)}(...)`;
}

function formatToolResult(result: ToolResultPart2): string {
  if (result.result.isError) {
    return 'Failed';
  }

  let content = '';
  const rawContent = result.result.llmContent;
  if (typeof rawContent === 'string') {
    content = rawContent;
  } else if (Array.isArray(rawContent)) {
    content = rawContent
      .filter((p) => p.type === 'text')
      .map((p) => (p as TextPart).text)
      .join('');
  }

  const lines = content.split('\n');
  const lineCount = lines.length;

  if (lineCount > 1) {
    return `Result(${lineCount} lines)`; // Generic for multiline output
  }

  if (content.length > 50) {
    return `${content.slice(0, 50)}...`;
  }

  return content || 'Done';
}

/**
 * Render a single nested agent message
 */
export function NestedAgentMessage({
  message,
}: {
  message: NormalizedMessage;
  isLast?: boolean;
}) {
  if (message.role === 'user') {
    const content =
      typeof message.content === 'string'
        ? message.content
        : JSON.stringify(message.content);
    return (
      <Box>
        <Text color="cyan">│ </Text>
        <Text color="blue">User: </Text>
        <Text>
          {content.length > 60 ? `${content.slice(0, 60)}...` : content}
        </Text>
      </Box>
    );
  }

  if (message.role === 'assistant') {
    const assistantMsg = message as AssistantMessage;

    // Text response
    if (typeof assistantMsg.content === 'string') {
      return (
        <Box>
          <Text color="cyan">│ </Text>
          <Text color="white">Assistant: </Text>
          <Text>
            {assistantMsg.content.length > 60
              ? `${assistantMsg.content.slice(0, 60)}...`
              : assistantMsg.content}
          </Text>
        </Box>
      );
    }

    // Tool calls
    if (Array.isArray(assistantMsg.content)) {
      const toolUses = assistantMsg.content.filter(
        (p) => p.type === 'tool_use',
      );
      const textParts = assistantMsg.content.filter((p) => p.type === 'text');

      return (
        <Box flexDirection="column">
          {textParts.map((part, idx) => {
            if ('text' in part) {
              return (
                <Box key={`text-${idx}`}>
                  <Text color="cyan">│ </Text>
                  <Text color="white">Assistant: </Text>
                  <Text>
                    {part.text.length > 60
                      ? `${part.text.slice(0, 60)}...`
                      : part.text}
                  </Text>
                </Box>
              );
            }
            return null;
          })}
          {toolUses.map((toolUse, idx) => {
            if ('name' in toolUse) {
              return (
                <Box key={`tool-${idx}`}>
                  <Text color="cyan">│ </Text>
                  {/* <Text color="white">Assistant: </Text> */}
                  <Text color="gray">└ </Text>
                  <Text color={UI_COLORS.TOOL}>
                    {formatToolUse(toolUse as ToolUsePart)}
                  </Text>
                </Box>
              );
            }
            return null;
          })}
        </Box>
      );
    }
  }

  if (message.role === 'tool') {
    // We might want to show tool results in expanded view too
    // But usually tool results are verbose.
    return (
      <Box>
        <Text color="cyan">│ </Text>
        <Text color="green"> </Text>
        <Text color={UI_COLORS.TOOL_RESULT}>✓ Tool results</Text>
      </Box>
    );
  }

  return null;
}
