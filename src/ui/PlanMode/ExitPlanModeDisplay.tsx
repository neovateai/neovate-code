import { Box, Text } from 'ink';
import React from 'react';
import type { ToolResultPart, ToolUsePart } from '../../message';
import { SPACING, UI_COLORS } from '../constants';
import { PlanViewer } from './PlanViewer';

interface ExitPlanModeDisplayProps {
  toolUse: ToolUsePart;
  toolResult?: ToolResultPart;
}

export function ExitPlanModeDisplay({
  toolUse,
  toolResult,
}: ExitPlanModeDisplayProps) {
  // Determine display name based on whether result exists
  const displayName = toolResult
    ? 'Plan approved ✓'
    : toolUse.displayName || toolUse.name;

  return (
    <Box flexDirection="column">
      {/* Tool name */}
      <Box marginTop={SPACING.MESSAGE_MARGIN_TOP}>
        <Text bold color={UI_COLORS.TOOL}>
          {displayName}
        </Text>
      </Box>

      {/* Tool result if available */}
      {toolResult && (
        <Box marginTop={SPACING.MESSAGE_MARGIN_TOP_TOOL_RESULT}>
          <ExitPlanModeResult toolResult={toolResult} />
        </Box>
      )}
    </Box>
  );
}

function ExitPlanModeResult({ toolResult }: { toolResult: ToolResultPart }) {
  const { result } = toolResult;

  // Handle error state
  if (result.isError) {
    let text = result.returnDisplay || result.llmContent;
    if (typeof text !== 'string') {
      text = JSON.stringify(text);
    }
    return <Text color={UI_COLORS.ERROR}>{text}</Text>;
  }

  // Check if returnDisplay is plan_mode_exit type
  if (
    typeof result.returnDisplay === 'object' &&
    result.returnDisplay.type === 'plan_mode_exit'
  ) {
    const { planContent, planFilePath, scenario } = result.returnDisplay;

    // Only render PlanViewer for approved_with_plan scenario
    if (scenario === 'approved_with_plan' && planContent) {
      return (
        <PlanViewer
          planContent={planContent}
          planFilePath={planFilePath}
          maxLines={10}
        />
      );
    }
  }

  // Fallback to default text display
  let text = result.returnDisplay || result.llmContent;
  if (typeof text !== 'string') {
    text = JSON.stringify(text);
  }
  return <Text color={UI_COLORS.TOOL_RESULT}>{text}</Text>;
}
