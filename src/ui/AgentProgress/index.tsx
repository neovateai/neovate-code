import { useEffect } from 'react';
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
  const { agentProgressMap, setFocusedAgent } = useAppStore();
  const progressData = agentProgressMap[toolUse.id];

  useEffect(() => {
    setFocusedAgent(toolUse.id);
    return () => setFocusedAgent(null);
  }, [toolUse.id, setFocusedAgent]);

  if (progressData && progressData.status === 'running') {
    return <AgentInProgress toolUse={toolUse} progressData={progressData} />;
  }

  if (toolResult) {
    return <AgentCompletedResult toolUse={toolUse} toolResult={toolResult} />;
  }

  return <AgentStarting toolUse={toolUse} />;
}
