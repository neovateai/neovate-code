import type { Context } from '../../context';
import type { AgentDefinition } from '../types';
import { createExploreAgent } from './explore';
import { createPlanAgent } from './plan';

export function getBuiltinAgents(opts: {
  context: Context;
}): AgentDefinition[] {
  return [createExploreAgent(opts), createPlanAgent(opts)];
}
