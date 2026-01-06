import { Box, Text } from 'ink';
import { useMemo } from 'react';
import type { ToolResultPart, ToolUsePart } from '../../message';
import { symbols } from '../../utils/symbols';
import { SPACING, UI_COLORS } from '../constants';
import { Markdown } from '../Markdown';
import type { AgentProgressState } from '../store';
import { useAppStore } from '../store';
import { LogItemRenderer } from './NestedMessage';
import {
  calculateStats,
  formatDuration,
  formatTokens,
  groupMessages,
} from './utils';

const VISIBLE_MESSAGE_LIMIT = 3;

const COLORS = {
  RUNNING: 'gray',
  COMPLETED: 'green',
  FAILED: 'red',
  AGENT_TYPE: 'cyan',
  HINT: 'gray',
} as const;

function AgentToolUse({
  toolUse,
  status,
  model,
}: {
  toolUse: ToolUsePart;
  status: 'starting' | 'running' | 'completed' | 'failed';
  model?: string;
}) {
  const { model: mainModel } = useAppStore();
  const agentType = toolUse.input?.subagent_type || toolUse.name;
  const description = toolUse.input?.description;

  const showModel = useMemo(() => {
    if (!model) return false;
    if (!mainModel?.model) return true;

    // Check for exact match with ID
    if (mainModel.model.id === model) return false;

    // Check for match with Full ID (provider/model)
    const fullId = `${mainModel.provider.id}/${mainModel.model.id}`;
    if (fullId === model) return false;

    return true;
  }, [model, mainModel]);

  const descText = useMemo(() => {
    if (!description && !showModel) return null;
    const parts: string[] = [];
    if (description) parts.push(description);
    if (showModel) parts.push(`with ${model}`);
    return parts.join(' ');
  }, [description, showModel, model]);

  const color = useMemo(() => {
    if (status === 'starting') return COLORS.RUNNING;
    if (status === 'completed') return COLORS.COMPLETED;
    if (status === 'failed') return COLORS.FAILED;
    return UI_COLORS.TOOL;
  }, [status]);

  const descColor = useMemo(() => {
    if (status === 'completed') return COLORS.HINT;
    if (status === 'failed') return COLORS.HINT;
    return UI_COLORS.TOOL_DESCRIPTION;
  }, [status]);

  return (
    <Box marginTop={SPACING.MESSAGE_MARGIN_TOP}>
      <Text bold color={color}>
        {agentType}
      </Text>
      {descText && <Text color={descColor}> ({descText})</Text>}
    </Box>
  );
}

interface AgentProgressOverlayProps {
  toolUse: ToolUsePart;
}

export function AgentStarting({ toolUse }: AgentProgressOverlayProps) {
  const { approvalModal } = useAppStore();
  // Check if we're waiting for approval
  const waitingForApproval = !!approvalModal;

  const text = useMemo(() => {
    return waitingForApproval
      ? 'Paused – waiting for tool approval...'
      : 'Initializing...';
  }, [waitingForApproval]);

  return (
    <Box flexDirection="column" paddingX={1}>
      <AgentToolUse toolUse={toolUse} status="running" />
      <Box marginTop={SPACING.MESSAGE_MARGIN_TOP_TOOL_RESULT} paddingLeft={1}>
        <Text color={UI_COLORS.TOOL_RESULT}>
          {symbols.arrowDown} {text}
        </Text>
      </Box>
    </Box>
  );
}

interface AgentInProgressProps {
  toolUse: ToolUsePart;
  progressData: AgentProgressState;
}

/**
 * Render SubAgent in running state
 * - Always expanded (running tasks need to show real-time progress)
 * - Shows last N messages by default (smart truncation)
 * - Displays real-time statistics
 */
export function AgentInProgress({
  toolUse,
  progressData,
}: AgentInProgressProps) {
  const { transcriptMode } = useAppStore();
  const { messages } = progressData;

  // Calculate statistics
  const stats = useMemo(() => calculateStats(messages), [messages]);

  // Group messages into LogItems
  const logItems = useMemo(() => groupMessages(messages), [messages]);

  // Smart truncation: show only last N items by default
  const visibleItems = transcriptMode
    ? logItems
    : logItems.slice(-VISIBLE_MESSAGE_LIMIT);
  const hiddenCount = logItems.length - visibleItems.length;

  const prompt = toolUse.input?.prompt;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <AgentToolUse
        toolUse={toolUse}
        status="running"
        model={progressData.model}
      />

      {/* Message list */}
      <Box flexDirection="column">
        {!transcriptMode && hiddenCount > 0 && (
          <Box paddingLeft={1}>
            <Text color={COLORS.HINT} dimColor>
              ... {hiddenCount} more items
            </Text>
          </Box>
        )}

        {/* Show prompt in transcript mode */}
        {transcriptMode && prompt && (
          <Box flexDirection="column" marginLeft={2} marginTop={1}>
            <Box flexDirection="column" marginBottom={1}>
              <Box>
                <Text color="gray">↳ </Text>
                <Text bold color="cyan">
                  Prompt:
                </Text>
              </Box>
              <Text color="gray">{prompt}</Text>
            </Box>
          </Box>
        )}

        {visibleItems.map((item) => (
          <LogItemRenderer key={item.id} item={item} />
        ))}
      </Box>

      {/* Status bar */}
      <Box paddingLeft={1} marginTop={0}>
        <Text color="gray" dimColor>
          {' '}
          (Press ctrl+o to expand) · {stats.toolCalls} tool uses ·{' '}
          {formatTokens(stats.tokens)} tokens
        </Text>
      </Box>
    </Box>
  );
}

interface AgentResultProps {
  toolUse: ToolUsePart;
  toolResult: ToolResultPart;
}

interface AgentResultDisplay {
  type: 'agent_result';
  agentId: string;
  agentType: string;
  description: string;
  prompt: string;
  content: string;
  model?: string;
  stats: {
    toolCalls: number;
    duration: number;
    tokens: {
      input: number;
      output: number;
    };
  };
  status: 'completed' | 'failed';
}

export function AgentCompletedResult({
  toolUse,
  toolResult,
}: AgentResultProps) {
  const { transcriptMode } = useAppStore();
  const isError = toolResult.result.isError;

  const returnDisplay = toolResult.result.returnDisplay as
    | AgentResultDisplay
    | undefined;

  const prompt = returnDisplay?.prompt || toolUse.input?.prompt || 'N/A';
  const content =
    returnDisplay?.content ||
    (typeof toolResult.result.llmContent === 'string'
      ? toolResult.result.llmContent
      : JSON.stringify(toolResult.result.llmContent));
  const stats = returnDisplay?.stats;

  const StatsDisplay = useMemo(() => {
    if (isError) {
      return (
        <Box marginLeft={2}>
          <Text color={COLORS.FAILED}>Failed {content}</Text>
        </Box>
      );
    }

    if (!stats) {
      return null;
    }

    return (
      <Box marginLeft={2}>
        <Text color="gray">
          {'Done'} ({stats.toolCalls} tool uses ·{' '}
          {formatTokens(stats.tokens.input + stats.tokens.output)} tokens ·{' '}
          {formatDuration(stats.duration)})
        </Text>
      </Box>
    );
  }, [stats, isError, content]);

  return (
    <Box flexDirection="column" marginTop={1}>
      <AgentToolUse
        toolUse={toolUse}
        status={isError ? 'failed' : 'completed'}
        model={returnDisplay?.model}
      />

      {StatsDisplay}

      {transcriptMode && (
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Box flexDirection="column" marginLeft={2}>
            <Box flexDirection="column" marginBottom={1}>
              <Box>
                <Text color="gray">↳ </Text>
                <Text bold color="cyan">
                  Prompt:
                </Text>
              </Box>
              <Text color="gray">{prompt}</Text>
            </Box>

            <Box flexDirection="column">
              <Box>
                <Text color="gray">↳ </Text>
                <Text bold color="cyan">
                  Response:
                </Text>
              </Box>
              <Markdown>{content}</Markdown>
            </Box>
          </Box>
        </Box>
      )}

      {!transcriptMode && (
        <Box marginLeft={2}>
          <Text color="gray" dimColor>
            Press ctrl+o to expand
          </Text>
        </Box>
      )}
    </Box>
  );
}
