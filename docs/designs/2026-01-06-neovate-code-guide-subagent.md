# Neovate Code Guide Subagent

**Date:** 2026-01-06

## Context

The goal was to add a `neovate-code-guide` subagent to the agent system, modeled after Claude Code's `claude-code-guide` agent. This agent helps users understand and use Neovate Code effectively by fetching official documentation and providing contextual guidance.

Key requirements from the initial idea:
1. Only one category: "Neovate Code" (unlike Claude Code which has SDK and API categories)
2. Remote documentation URL: `https://neovateai.dev/llms-map.txt`
3. Dynamic System Prompt Builder that includes user's configuration
4. Feedback/issues instruction pointing to GitHub

## Discussion

### User Config in Dynamic Prompt

**Question:** Which user config items should be included in the dynamic system prompt?

**Options explored:**
- All config items (MCP servers, custom skills, custom agents, plugin skills, settings)
- Only MCP servers + settings
- Settings only

**Decision:** Include all config items to match the reference implementation and provide comprehensive context.

### Prompt Type

**Question:** Should the system prompt be static or dynamic?

**Options explored:**
- Dynamic function that builds the prompt at runtime with user's config
- Static string with dynamic parts added later

**Decision:** Dynamic function (`buildSystemPrompt(context)`) that builds the prompt at agent creation time using the context.

## Approach

Create a built-in agent that:
1. Specializes in answering questions about Neovate Code
2. Uses a small/fast model (haiku equivalent) for cost efficiency
3. Is read-only (no file editing capabilities)
4. Dynamically includes user's configuration in the system prompt
5. Fetches official documentation to answer questions accurately

## Architecture

### Files Modified/Created

1. `src/constants.ts` - Added `NEOVATE_CODE_GUIDE = 'neovate-code-guide'` to `AGENT_TYPE` enum
2. `src/agent/builtin/neovate-code-guide.ts` - New agent definition with dynamic system prompt builder
3. `src/agent/builtin/index.ts` - Registered the new agent

### Agent Configuration

```typescript
{
  agentType: 'neovate-code-guide',
  model: context.config.smallModel || context.config.model,
  tools: ['glob', 'grep', 'read', 'fetch'],
  disallowedTools: ['task', 'edit', 'write'],
  source: AgentSource.BuiltIn,
  forkContext: false,
  color: 'green'
}
```

### Dynamic System Prompt Builder

The `buildSystemPrompt(context)` function constructs the prompt with:

1. **Base prompt**: Expertise description, documentation URL, approach guidelines
2. **User configuration sections** (appended when available):
   - Custom skills from `context.skillManager.getSkills()`
   - Custom agents (non-built-in) from `context.agentManager.getAllAgents()`
   - MCP servers from `context.config.mcpServers`
   - User settings (language, approvalMode, model, plugins)
3. **Feedback instruction**: Links to `https://github.com/neovateai/neovate-code/issues`

### whenToUse Description

```
Use this agent when the user asks questions ("Can Neovate...", "Does Neovate...",
"How do I...") about Neovate Code (the CLI tool) - features, hooks, skills,
MCP servers, settings, IDE integrations, keyboard shortcuts.
**IMPORTANT:** Before spawning a new agent, check if there is already a running
or recently completed neovate-code-guide agent that you can resume using the
"resume" parameter.
```

### Key Design Patterns

1. **Documentation-First**: Agent fetches docs map first, then provides guidance
2. **Context-Aware**: Includes user's local configuration for personalized answers
3. **Cost-Efficient**: Uses small model for fast, low-cost responses
4. **Read-Only**: Cannot modify files, only research and guide
