import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import React, { useCallback } from 'react';
import { ActivityIndicator } from './ActivityIndicator';
import { ApprovalModal } from './ApprovalModal';
import { ChatInput } from './ChatInput';
import { Debug } from './Debug';
import { ExitHint } from './ExitHint';
import { Markdown } from './Markdown';
import { Messages } from './Messages';
import { QueueDisplay } from './QueueDisplay';
import { useAppStore } from './store';
import { useTerminalRefresh } from './useTerminalRefresh';

function SlashCommandJSX() {
  const { slashCommandJSX } = useAppStore();
  return <Box>{slashCommandJSX}</Box>;
}

function PlanResult() {
  const { planResult, approvePlan, denyPlan } = useAppStore();
  const onSelect = useCallback(
    (approved: boolean) => {
      if (approved) {
        approvePlan(planResult ?? '');
      } else {
        denyPlan();
      }
    },
    [planResult, approvePlan, denyPlan],
  );
  if (!planResult) return null;
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      padding={1}
    >
      <Text bold>Here is the plan:</Text>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        padding={1}
      >
        <Markdown>{planResult ?? ''}</Markdown>
      </Box>
      <Box marginY={1}>
        <Text bold>Do you want to proceed?</Text>
      </Box>
      <SelectInput
        items={[
          {
            label: 'Yes',
            value: true,
          },
          {
            label: 'No, I want to edit the plan',
            value: false,
          },
        ]}
        onSelect={(item: any) => onSelect(item.value)}
      />
    </Box>
  );
}

export function App() {
  const { forceRerender, forceUpdate } = useTerminalRefresh();
  return (
    <Box flexDirection="column" key={forceRerender}>
      <Messages />
      <PlanResult />
      <ActivityIndicator />
      <QueueDisplay />
      <ChatInput />
      <SlashCommandJSX />
      <ApprovalModal />
      <ExitHint />
      <Debug />
    </Box>
  );
}
