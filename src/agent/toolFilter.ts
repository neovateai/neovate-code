import type { Tool } from '../tool';
import type { AgentDefinition } from './types';

export function filterTools(
  allTools: Tool[],
  agentDef: AgentDefinition,
): Tool[] {
  const { tools, disallowedTools } = agentDef;
  const disallowedSet = new Set(disallowedTools || []);
  const hasWildcard =
    tools === undefined || (tools.length === 1 && tools[0] === '*');

  if (hasWildcard) {
    return allTools.filter((tool) => !disallowedSet.has(tool.name));
  }

  const allowedSet = new Set(tools);
  return allTools.filter(
    (tool) => allowedSet.has(tool.name) && !disallowedSet.has(tool.name),
  );
}
