import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import React from 'react';
import { PLAN_OPTIONS } from '../constants';
import { usePlanModal } from '../hooks/usePlanModal';
import Markdown from '../ink-markdown';

interface PlanModalSelectInputProps {
  onSelect: (approved: boolean) => void;
}

function PlanModalSelectInput({ onSelect }: PlanModalSelectInputProps) {
  return (
    <SelectInput
      items={[...PLAN_OPTIONS] as any[]}
      onSelect={(item: any) => onSelect(item.value)}
    />
  );
}

interface PlanModalProps {
  planText: string;
}

export function PlanModal({ planText }: PlanModalProps) {
  const { handlePlanApproval } = usePlanModal();

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
        <Markdown>{planText}</Markdown>
      </Box>
      <Box marginY={1}>
        <Text bold>Do you want to proceed?</Text>
      </Box>
      <PlanModalSelectInput onSelect={handlePlanApproval} />
    </Box>
  );
}
