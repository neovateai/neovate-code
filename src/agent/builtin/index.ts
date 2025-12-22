import type { Context } from '../../context';
import type { AgentDefinition } from '../types';
import { createExploreAgent } from './explore';

export function getBuiltinAgents(opts: {
  context: Context;
}): AgentDefinition[] {
  return [createExploreAgent(opts)];
}
