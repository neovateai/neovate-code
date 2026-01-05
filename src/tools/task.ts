import { z } from 'zod';
import { TOOL_NAMES } from '../constants';
import type { Context } from '../context';
import type { NormalizedMessage } from '../message';
import {
  type ApprovalCategory,
  createTool,
  type Tool,
  type ToolApprovalResult,
  type ToolUse,
} from '../tool';
import { randomUUID } from '../utils/randomUUID';

export function createTaskTool(opts: {
  context: Context;
  tools: Tool[];
  sessionId: string;
  signal?: AbortSignal;
}) {
  const { signal, sessionId } = opts;
  const { cwd, agentManager, messageBus } = opts.context;
  const agentDescriptions = agentManager?.getAgentDescriptions();

  return createTool({
    name: TOOL_NAMES.TASK,

    description: `Launch a new agent to handle complex, multi-step tasks autonomously.
The ${TOOL_NAMES.TASK} tool launches specialized agents (subprocesses) that autonomously handle complex tasks. Each agent type has specific capabilities and tools available to it.
Available agent types and the tools they have access to:

${agentDescriptions}

When using the ${TOOL_NAMES.TASK} tool, you must specify a subagent_type parameter to select which agent type to use.

When NOT to use the Agent tool:
- If you want to read a specific file path, use the ${TOOL_NAMES.READ} or ${TOOL_NAMES.GLOB} tool instead of the Agent tool, to find the match more quickly
- If you are searching for a specific class definition like "class Foo", use the ${TOOL_NAMES.GLOB} tool instead, to find the match more quickly
- If you are searching for code within a specific file or set of 2-3 files, use the ${TOOL_NAMES.READ} tool instead of the Agent tool, to find the match more quickly
- Other tasks that are not related to the agent descriptions above

Usage notes:
- Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses
- When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.
- Each agent invocation is stateless. You will not be able to send additional messages to the agent, nor will the agent be able to communicate with you outside of its final report. Therefore, your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.
- The agent's outputs should generally be trusted
- Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since it is not aware of the user's intent
- If the agent description mentions that it should be used proactively, then you should try your best to use it without the user having to ask for it first. Use your judgement.
- If the user specifies that they want you to run agents "in parallel", you MUST send a single message with multiple Task tool use content blocks. For example, if you need to launch both a code-reviewer agent and a test-runner agent in parallel, send a single message with both tool calls.

Example usage:

<example_agent_descriptions>
"code-reviewer": use this agent after you are done writing a signficant piece of code
"greeting-responder": use this agent when to respond to user greetings with a friendly joke
</example_agent_description>

<example>
user: "Please write a function that checks if a number is prime"
assistant: Sure let me write a function that checks if a number is prime
assistant: First let me use the ${TOOL_NAMES.WRITE} tool to write a function that checks if a number is prime
assistant: I'm going to use the ${TOOL_NAMES.WRITE} tool to write the following code:
<code>
function isPrime(n) {
  if (n <= 1) return false
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false
  }
  return true
}
</code>
<commentary>
Since a signficant piece of code was written and the task was completed, now use the code-reviewer agent to review the code
</commentary>
assistant: Now let me use the code-reviewer agent to review the code
assistant: Uses the ${TOOL_NAMES.TASK} tool to launch the with the code-reviewer agent
</example>

<example>
user: "Hello"
<commentary>
Since the user is greeting, use the greeting-responder agent to respond with a friendly joke
</commentary>
assistant: "I'm going to use the ${TOOL_NAMES.TASK} tool to launch the with the greeting-responder agent"
</example>
      `,

    parameters: z.object({
      description: z
        .string()
        .describe('A short (3-5 word) description of task'),
      prompt: z.string().describe('The task for the agent to perform'),
      subagent_type: z
        .string()
        .describe('The type of specialized agent to use for this task'),
      resume: z
        .string()
        .optional()
        .describe(
          'Optional agent ID to resume from. If provided, the agent will continue from the previous execution transcript.',
        ),
    }),

    execute: async (params, toolCallId?: string) => {
      const startTime = Date.now();
      const parentToolUseId = toolCallId;

      if (!toolCallId) {
        return {
          llmContent: 'Tool call ID is required',
          isError: true,
        };
      }

      if (!agentManager) {
        return {
          llmContent: 'Agent manager not found',
          isError: true,
        };
      }

      // Create onToolApprove callback to handle tool approval requests from agent
      const onToolApprove = async (opts: {
        toolUse: ToolUse;
        category?: ApprovalCategory;
      }): Promise<boolean | ToolApprovalResult> => {
        // If messageBus is not available, fallback to auto-approve
        if (!messageBus) {
          return true;
        }

        try {
          const result = await messageBus.request('toolApproval', {
            toolUse: opts.toolUse,
            category: opts.category,
          });

          // Handle both boolean and ToolApprovalResult return types
          if (result.params || result.denyReason) {
            return {
              approved: result.approved,
              params: result.params,
              denyReason: result.denyReason,
            };
          }

          return result.approved;
        } catch (error) {
          console.error('[createTaskTool] onToolApprove error:', error);
          // On error, fallback to auto-approve
          return true;
        }
      };

      try {
        const result = await agentManager.executeTask(params, {
          cwd,
          signal,
          tools: opts.tools,
          onToolApprove,
          async onMessage(
            message: NormalizedMessage,
            agentId: string,
            model: string,
          ) {
            try {
              if (messageBus) {
                await messageBus.emitEvent('agent.progress', {
                  sessionId,
                  cwd,
                  agentId,
                  agentType: params.subagent_type,
                  prompt: params.prompt,
                  message,
                  parentToolUseId,
                  status: 'running',
                  model,
                  timestamp: Date.now(),
                });
              }
            } catch (error) {
              console.error(
                '[createTaskTool] Failed to emit progress event:',
                error,
              );
            }
          },
          // TODO: get forkContextMessages from context
          // forkContextMessages: [],
        });

        // Emit completion event to close the UI overlay
        if (messageBus) {
          await messageBus.emitEvent('agent.progress', {
            sessionId,
            cwd,
            agentId: result.agentId,
            agentType: params.subagent_type,
            prompt: params.prompt,
            message: {
              role: 'assistant',
              content:
                result.status === 'completed'
                  ? 'Task completed'
                  : 'Task failed',
              type: 'message',
              uuid: randomUUID(),
              timestamp: new Date().toISOString(),
              parentUuid: null,
            } as NormalizedMessage,
            parentToolUseId,
            status: result.status === 'completed' ? 'completed' : 'failed',
            model: result.model,
            timestamp: Date.now(),
          });
        }

        const duration = Date.now() - startTime;

        if (result.status === 'completed') {
          return {
            llmContent: `Sub-agent (${params.subagent_type}) completed successfully:\n\n${result.content}\n\n---\nAgent ID: ${result.agentId}`,
            isError: false,
            returnDisplay: {
              type: 'agent_result',
              agentId: result.agentId,
              agentType: params.subagent_type,
              description: params.description,
              prompt: params.prompt,
              content: result.content,
              model: result.model,
              stats: {
                toolCalls: result.totalToolCalls,
                duration,
                tokens: {
                  input: result.usage.inputTokens,
                  output: result.usage.outputTokens,
                },
              },
              status: 'completed',
            },
            metadata: {
              agentId: result.agentId,
              agentType: params.subagent_type,
            },
          };
        }
        return {
          llmContent: `Sub-agent (${params.subagent_type}) failed:\n\n${result.content}\n\n---\nAgent ID: ${result.agentId}`,
          isError: true,
          returnDisplay: {
            type: 'agent_result',
            agentId: result.agentId,
            agentType: params.subagent_type,
            description: params.description,
            prompt: params.prompt,
            content: result.content,
            model: result.model,
            stats: {
              toolCalls: 0,
              duration,
              tokens: {
                input: 0,
                output: 0,
              },
            },
            status: 'failed',
          },
          metadata: {
            agentId: result.agentId,
            agentType: params.subagent_type,
          },
        };
      } catch (error) {
        return {
          llmContent: `Failed to execute sub-agent: ${error instanceof Error ? error.message : String(error)}`,
          isError: true,
        };
      }
    },

    approval: { category: 'read' },
  });
}
