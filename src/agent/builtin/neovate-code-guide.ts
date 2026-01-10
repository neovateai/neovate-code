import { AGENT_TYPE } from '../../constants';
import type { Context } from '../../context';
import type { AgentDefinition } from '../types';
import { AgentSource } from '../types';
import {
  buildDisallowedTools,
  CONTEXT_NOTES,
  EDIT_TOOLS,
  TASK_TOOL_NAME,
} from './common';

const NEOVATE_CODE_DOCS_URL = 'https://neovateai.dev/llms-map.txt';
const FEEDBACK_URL = 'https://github.com/neovateai/neovate-code/issues';

function buildSystemPrompt(context: Context): string {
  const basePrompt = `You are the Neovate Code guide agent. Your primary responsibility is helping users understand and use Neovate Code effectively.

**Your expertise:**

Neovate Code (the CLI tool): Installation, configuration, hooks, skills, MCP servers, keyboard shortcuts, IDE integrations, settings, and workflows.

**Documentation source:**

- **Neovate Code docs** (${NEOVATE_CODE_DOCS_URL}): Fetch this for questions about the Neovate Code CLI tool, including:
  - Installation, setup, and getting started
  - Hooks (pre/post command execution)
  - Custom skills
  - MCP server configuration
  - IDE integrations (VS Code, JetBrains)
  - Settings files and configuration
  - Keyboard shortcuts and hotkeys
  - Subagents and plugins
  - Sandboxing and security

**Approach:**
1. Determine the specific aspect of Neovate Code the user is asking about
2. Use the fetch tool to fetch the documentation from ${NEOVATE_CODE_DOCS_URL}
3. Identify the most relevant sections from the documentation
4. Provide clear, actionable guidance based on official documentation
5. Reference local project files (CLAUDE.md, .neovate/ directory) when relevant using read, glob, and grep tools

**Guidelines:**
- Always prioritize official documentation over assumptions
- Keep responses concise and actionable
- Include specific examples or code snippets when helpful
- Reference exact documentation URLs in your responses
- Avoid emojis in your responses
- Help users discover features by proactively suggesting related commands, shortcuts, or capabilities

${CONTEXT_NOTES}

- When you cannot find an answer or the feature doesn't exist, direct the user to report the issue at ${FEEDBACK_URL}`;

  // Build user configuration context
  const contextParts: string[] = [];

  // 1. Custom skills
  const skills = context.skillManager?.getSkills() || [];
  if (skills.length > 0) {
    const skillsList = skills
      .map((skill) => `- /${skill.name}: ${skill.description}`)
      .join('\n');
    contextParts.push(`**Available custom skills in this project:**
${skillsList}`);
  }

  // 2. Custom agents (non-built-in)
  const allAgents = context.agentManager?.getAllAgents() || [];
  const customAgents = allAgents.filter(
    (agent) => agent.source !== AgentSource.BuiltIn,
  );
  if (customAgents.length > 0) {
    const agentsList = customAgents
      .map((agent) => `- ${agent.agentType}: ${agent.whenToUse}`)
      .join('\n');
    contextParts.push(`**Available custom agents configured:**
${agentsList}`);
  }

  // 3. MCP servers
  const mcpServers = context.config?.mcpServers || {};
  const mcpServerNames = Object.keys(mcpServers).filter(
    (name) => !mcpServers[name].disable,
  );
  if (mcpServerNames.length > 0) {
    const mcpList = mcpServerNames.map((name) => `- ${name}`).join('\n');
    contextParts.push(`**Configured MCP servers:**
${mcpList}`);
  }

  // 4. User settings (filtered for relevant info)
  const relevantSettings: Record<string, unknown> = {};
  if (context.config?.language) {
    relevantSettings.language = context.config.language;
  }
  if (context.config?.approvalMode) {
    relevantSettings.approvalMode = context.config.approvalMode;
  }
  if (context.config?.model) {
    relevantSettings.model = context.config.model;
  }
  if (context.config?.plugins && context.config.plugins.length > 0) {
    relevantSettings.plugins = context.config.plugins;
  }

  if (Object.keys(relevantSettings).length > 0) {
    const settingsJson = JSON.stringify(relevantSettings, null, 2);
    contextParts.push(`**User's settings:**
\`\`\`json
${settingsJson}
\`\`\``);
  }

  // Combine base prompt with user configuration
  if (contextParts.length > 0) {
    return `${basePrompt}

---

# User's Current Configuration

The user has the following custom setup in their environment:

${contextParts.join('\n\n')}

When answering questions, consider these configured features and proactively suggest them when relevant.`;
  }

  return basePrompt;
}

export function createNeovateCodeGuideAgent(opts: {
  context: Context;
}): AgentDefinition {
  const { context } = opts;

  return {
    agentType: AGENT_TYPE.NEOVATE_CODE_GUIDE,

    whenToUse: `Use this agent when the user asks questions ("Can Neovate...", "Does Neovate...", "How do I...") about Neovate Code (the CLI tool) - features, hooks, skills, MCP servers, settings, IDE integrations, keyboard shortcuts. **IMPORTANT:** Before spawning a new agent, check if there is already a running or recently completed neovate-code-guide agent that you can resume using the "resume" parameter.`,

    systemPrompt: buildSystemPrompt(context),
    isEnabled(context) {
      return context.productName === 'neovate';
    },

    model: context.config.smallModel || context.config.model,
    source: AgentSource.BuiltIn,
    tools: ['glob', 'grep', 'read', 'fetch'],
    disallowedTools: buildDisallowedTools([TASK_TOOL_NAME], EDIT_TOOLS),
    forkContext: false,
    color: 'green',
  };
}
