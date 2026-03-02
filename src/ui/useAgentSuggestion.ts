import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from './store';

export interface AgentInfo {
  agentType: string;
  description: string;
  color?: string;
}

export function useAgentSuggestion(query: string, hasQuery: boolean) {
  const { bridge, cwd } = useAppStore();
  const [allAgents, setAllAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    setIsLoading(true);
    bridge
      .request('agents.list', { cwd })
      .then((res) => {
        if (res.success) {
          setAllAgents(res.data.agents);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to list agents:', error);
        setIsLoading(false);
      });
  }, [bridge, cwd]);

  const agents = useMemo(() => {
    if (!hasQuery) return [];
    return allAgents;
  }, [hasQuery, allAgents]);

  const filteredAgents = agents.filter((agent) => {
    if (!query) return true;
    const lowerQuery = query.toLowerCase();
    const displayText = `agent-${agent.agentType}`.toLowerCase();
    return (
      displayText.includes(lowerQuery) ||
      agent.agentType.toLowerCase().includes(lowerQuery) ||
      agent.description.toLowerCase().includes(lowerQuery)
    );
  });

  return {
    agents: filteredAgents,
    isLoading,
  };
}
