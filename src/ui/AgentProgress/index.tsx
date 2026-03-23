import type { ToolResultPart, ToolUsePart } from '../../message';
import { useAppStore } from '../store';
import {
  AgentCompletedFromProgress,
  AgentCompletedResult,
  AgentInProgress,
  AgentStarting,
} from './AgentProgressOverlay';

interface AgentProgressProps {
  toolUse: ToolUsePart;
  toolResult?: ToolResultPart;
}

export function AgentProgress({ toolUse, toolResult }: AgentProgressProps) {
  const { agentProgressMap } = useAppStore();
  const progressData = agentProgressMap[toolUse.id];

  if (toolResult) {
    return <AgentCompletedResult toolUse={toolUse} toolResult={toolResult} />;
  }

  if (progressData && progressData.status !== 'running') {
    return (
      <AgentCompletedFromProgress
        toolUse={toolUse}
        progressData={progressData}
      />
    );
  }

  if (progressData) {
    return <AgentInProgress toolUse={toolUse} progressData={progressData} />;
  }

  return <AgentStarting toolUse={toolUse} />;
}
