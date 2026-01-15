import type { ToolResultPart, ToolUsePart } from '../../message';
import { useAppStore } from '../store';
import {
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

  // Prioritize toolResult check - if result exists, task is completed
  if (toolResult) {
    return <AgentCompletedResult toolUse={toolUse} toolResult={toolResult} />;
  }

  if (progressData && progressData.status === 'running') {
    return <AgentInProgress toolUse={toolUse} progressData={progressData} />;
  }

  return <AgentStarting toolUse={toolUse} />;
}
