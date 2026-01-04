# General-Purpose Sub-Agent Implementation

**Date:** 2026-01-04

## Context

The codebase currently has an `Explore` agent for read-only codebase exploration. Based on Claude Code v2.0.76's implementation, we need to add a `general-purpose` agent that serves as the default/fallback subagent with full tool access for autonomous multi-step task execution.

Reference implementation was extracted from Claude Code's `cli.js` and documented in an external analysis file.

## Discussion

### Tool Access
**Question:** What tool access should the general-purpose agent have?
**Decision:** All tools (`["*"]`) - most flexible, matching Claude Code's original implementation.

### Model Selection
**Question:** Which model should the general-purpose agent use?
**Decision:** Main model (`context.config.model`) - best quality for complex multi-step tasks.

### UI Display
**Question:** How should this agent be displayed in the UI?
**Decision:** Display as "general-purpose" (not the generic "Task" that Claude Code uses).

### Design Approaches Considered
1. **Approach A: Minimal** - All tools including task, no color, matches Claude Code ✅ Selected
2. **Approach B: Recursion Protection** - Add task to disallowedTools for safety
3. **Approach C: With Color** - Add distinct color for UI visibility

## Approach

Implement a minimal `general-purpose` agent following the exact pattern of `explore.ts`:
- Create a `createGeneralPurposeAgent` function returning an `AgentDefinition`
- Grant all tool access via `tools: ['*']`
- Use main model for best quality
- No color (default terminal appearance)
- No forkContext (starts fresh without parent conversation)

## Architecture

### Files to Modify/Create

| File | Action |
|------|--------|
| `src/constants.ts` | Add `GENERAL_PURPOSE = 'general-purpose'` to `AGENT_TYPE` enum |
| `src/agent/builtin/general-purpose.ts` | **New file** - agent definition |
| `src/agent/builtin/index.ts` | Import and register the new agent |

### Agent Definition

```typescript
// src/agent/builtin/general-purpose.ts
import { AGENT_TYPE } from '../../constants';
import type { Context } from '../../context';
import { type AgentDefinition, AgentSource } from '../types';
import { CONTEXT_NOTES } from './common';

export function createGeneralPurposeAgent(opts: {
  context: Context;
}): AgentDefinition {
  const { context } = opts;

  return {
    agentType: AGENT_TYPE.GENERAL_PURPOSE,
    whenToUse: `General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks. When you are searching for a keyword or file and are not confident that you will find the right match in the first few tries use this agent to perform the search for you.`,
    systemPrompt: `You are an agent for Neovate Code. Given the user's message, use the tools available to complete the task. Do what has been asked; nothing more, nothing less.

Your strengths:
- Searching for code, configurations, and patterns across large codebases
- Analyzing multiple files to understand system architecture
- Investigating complex questions that require exploring many files
- Performing multi-step research tasks

Guidelines:
- For file searches: Use grep or glob when you need to search broadly. Use read when you know the specific file path.
- For analysis: Start broad and narrow down. Use multiple search strategies if the first doesn't yield results.
- Be thorough: Check multiple locations, consider different naming conventions, look for related files.
- NEVER create files unless absolutely necessary. ALWAYS prefer editing existing files.
- NEVER proactively create documentation files unless explicitly requested.

${CONTEXT_NOTES}`,
    model: context.config.model,
    source: AgentSource.BuiltIn,
    tools: ['*'],
    forkContext: false,
  };
}
```

### Integration

```typescript
// src/agent/builtin/index.ts
import { createExploreAgent } from './explore';
import { createGeneralPurposeAgent } from './general-purpose';

export function getBuiltinAgents(opts: {
  context: Context;
}): AgentDefinition[] {
  return [
    createExploreAgent(opts),
    createGeneralPurposeAgent(opts),
  ];
}
```

### Constants Update

```typescript
// src/constants.ts
export enum AGENT_TYPE {
  EXPLORE = 'Explore',
  PLAN = 'Plan',
  GENERAL_PURPOSE = 'general-purpose',
}
```

### Key Differences from Explore Agent

| Property | Explore | General-Purpose |
|----------|---------|-----------------|
| `tools` | `disallowedTools` (read-only) | `['*']` (all tools) |
| `model` | `smallModel` | `model` (main) |
| `color` | `'blue'` | none |
| Purpose | Read-only exploration | Multi-step task execution |
