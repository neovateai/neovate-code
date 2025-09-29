import { Box, Text } from 'ink';
import path from 'pathe';
import React, { useMemo } from 'react';
import { useAppStore } from './store';
import { useInputHandlers } from './useInputHandlers';
import type { NormalizedMessage } from '../message';

function HelpHint() {
  const { status } = useAppStore();
  if (status !== 'help') return null;
  return (
    <Box flexDirection="row" paddingX={2} paddingY={0.5}>
      <Text color="gray">💡 Use /help to get started</Text>
    </Box>
  );
}

function getContextLeftColor(percentage: number): string {
  if (percentage >= 30) return 'green';
  if (percentage >= 10) return 'yellow';
  return 'red';
}

function StatusMain() {
  const {
    cwd,
    model,
    modelContextLimit,
    status,
    exitMessage,
    messages,
    sessionId,
    approvalMode,
  } = useAppStore();
  const tokenUsed = useMemo(() => {
    return messages.reduce((acc, message) => {
      if (message.role === 'assistant') {
        return (
          acc +
          (message.usage?.input_tokens ?? 0) +
          (message.usage?.output_tokens ?? 0)
        );
      } else {
        return acc;
      }
    }, 0);
  }, [messages]);
  const lastAssistantTokenUsed = useMemo(() => {
    // Find the last message with parentUuid === null (start of last conversation turn)
    let lastTurnStartIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i] as NormalizedMessage;
      if (
        message &&
        typeof message.parentUuid !== 'undefined' &&
        message.parentUuid === null
      ) {
        lastTurnStartIndex = i;
        break;
      }
    }

    // Get messages from the last conversation turn (or all messages if no turn boundary found)
    const relevantMessages =
      lastTurnStartIndex >= 0 ? messages.slice(lastTurnStartIndex) : messages;

    // Find the last assistant message in relevant scope
    let lastAssistantMessage: any = null;
    for (let i = relevantMessages.length - 1; i >= 0; i--) {
      if (relevantMessages[i].role === 'assistant') {
        lastAssistantMessage = relevantMessages[i];
        break;
      }
    }

    const inputTokens = lastAssistantMessage?.usage?.input_tokens ?? 0;
    const outputTokens = lastAssistantMessage?.usage?.output_tokens ?? 0;
    return inputTokens + outputTokens;
  }, [messages]);
  const contextLeftPercentage = useMemo(() => {
    let percentage = Math.round(
      ((modelContextLimit - lastAssistantTokenUsed) / modelContextLimit) * 100,
    );
    if (isNaN(percentage)) {
      percentage = 100;
    }
    return percentage;
  }, [lastAssistantTokenUsed, modelContextLimit]);
  const folderName = path.basename(cwd);
  if (status === 'help') return <HelpHint />;
  if (exitMessage) return <Text color="gray">{exitMessage}</Text>;
  const approval = (() => {
    if (approvalMode === 'default') return null;
    const color = approvalMode === 'yolo' ? 'red' : 'magenta';
    return (
      <>
        | <Text color={color}>{approvalMode}</Text>{' '}
      </>
    );
  })();
  return (
    <Box>
      <Text color="gray">
        [{model ? model : <Text color="red">use /model to select a model</Text>}
        ] | 📁 {folderName} | 🪙 {(tokenUsed / 1000).toFixed(1)}K |{' '}
        <Text color={getContextLeftColor(contextLeftPercentage)}>
          {contextLeftPercentage}%
        </Text>{' '}
        {approval}| 🆔 {sessionId || 'N/A'}
      </Text>
    </Box>
  );
}

function StatusSide() {
  return <UpgradeHint />;
}

function UpgradeHint() {
  const { upgrade } = useAppStore();
  const color = React.useMemo(() => {
    if (upgrade?.type === 'success') return 'green';
    if (upgrade?.type === 'error') return 'red';
    return 'gray';
  }, [upgrade]);
  if (!upgrade) return null;
  return (
    <Box>
      <Text color={color}>{upgrade.text}</Text>
    </Box>
  );
}

export function StatusLine() {
  const { slashCommandJSX, planResult } = useAppStore();
  const { slashCommands, fileSuggestion } = useInputHandlers();
  if (
    slashCommands.suggestions.length > 0 ||
    fileSuggestion.matchedPaths.length > 0
  ) {
    return null;
  }
  if (slashCommandJSX) {
    return null;
  }
  if (planResult) {
    return null;
  }
  return (
    <Box flexDirection="column" paddingX={2} paddingY={0}>
      <StatusMain />
      <StatusSide />
    </Box>
  );
}
