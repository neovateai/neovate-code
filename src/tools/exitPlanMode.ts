import { z } from 'zod';
import { PLAN_MODE_EVENTS, TOOL_NAMES } from '../constants';
import type { Context } from '../context';
import type { MessageBus } from '../messageBus';
import type { PlanFileManager } from '../planFile';
import { createTool, type ToolResult } from '../tool';

export interface CreateExitPlanModeToolOptions {
  context: Context;
  sessionId: string;
  messageBus?: MessageBus;
  planFileManager: PlanFileManager;
}

function buildExitPlanModeResponse(
  planContent: string | null,
  planFilePath: string,
  isAgent: boolean,
): ToolResult {
  // Scenario 1: Sub-agent completed
  if (isAgent) {
    return {
      llmContent: `User has approved the plan. There is nothing else needed from you now. Please respond with "ok"`,
      returnDisplay: {
        type: 'plan_mode_exit',
        planFilePath,
        planContent,
        isAgent: true,
        scenario: 'agent_completed',
      },
    };
  }

  // Scenario 2: Empty plan warning
  if (!planContent || planContent.trim() === '') {
    return {
      llmContent: `User has approved exiting plan mode. You can now proceed.

⚠️  Note: No plan content was found at ${planFilePath}
This is acceptable for research tasks or simple changes that don't require detailed planning.`,
      returnDisplay: {
        type: 'plan_mode_exit',
        planFilePath,
        planContent: null,
        isAgent: false,
        scenario: 'approved_without_plan',
      },
    };
  }

  // Scenario 3: Normal exit with complete plan
  return {
    llmContent: `User has approved your plan. You can now start coding. Start with updating your todo list if applicable.

Your plan has been saved to: ${planFilePath}
You can refer back to it if needed during implementation.

## Approved Plan:
${planContent}`,
    returnDisplay: {
      type: 'plan_mode_exit',
      planFilePath,
      planContent,
      isAgent: false,
      scenario: 'approved_with_plan',
    },
  };
}

export function createExitPlanModeTool(opts: CreateExitPlanModeToolOptions) {
  const { context, sessionId, messageBus, planFileManager } = opts;

  return createTool({
    name: TOOL_NAMES.EXIT_PLAN_MODE,

    displayName: 'Ready to code?',

    description: `Use this tool when you are in plan mode and have finished writing your plan to the plan file and are ready for user approval.

## How This Tool Works
- You should have already written your plan to the plan file specified in the plan mode system message
- This tool does NOT take the plan content as a parameter - it will read the plan from the file you wrote
- This tool simply signals that you're done planning and ready for the user to review and approve
- The user will see the contents of your plan file when they review it

## When to Use This Tool
IMPORTANT: Only use this tool when the task requires planning the implementation steps of a task that requires writing code. For research tasks where you're gathering information, searching files, reading files or in general trying to understand the codebase - do NOT use this tool.

## Before Using This Tool
Ensure your plan is complete and unambiguous:
- If you have unresolved questions about requirements or approach, use ${TOOL_NAMES.ASK_USER_QUESTION} first (in earlier phases)
- Once your plan is finalized, use THIS tool to request approval

**Important:** Do NOT use ${TOOL_NAMES.ASK_USER_QUESTION} to ask "Is this plan okay?" or "Should I proceed?" - that's exactly what THIS tool does. ExitPlanMode inherently requests user approval of your plan.

## Examples

1. Initial task: "Search for and understand the implementation of vim mode in the codebase" - Do not use the exit plan mode tool because you are not planning the implementation steps of a task.
2. Initial task: "Help me implement yank mode for vim" - Use the exit plan mode tool after you have finished planning the implementation steps of the task.
3. Initial task: "Add a new feature to handle user authentication" - If unsure about auth method (OAuth, JWT, etc.), use ${TOOL_NAMES.ASK_USER_QUESTION} first, then use exit plan mode tool after clarifying the approach.`,

    parameters: z.object({}),

    async execute(params) {
      const isAgent = sessionId.startsWith('agent-');
      const planFilePath = planFileManager.getPlanFilePath(sessionId);
      const planContent = planFileManager.readPlan(sessionId);

      // Notify client to exit Plan Mode via MessageBus
      if (messageBus) {
        try {
          await messageBus.emitEvent(PLAN_MODE_EVENTS.EXIT_PLAN_MODE, {
            sessionId,
            planFilePath,
            planContent,
            isAgent,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error('Failed to emit plan.exit event:', error);
        }
      }

      // Directly return buildExitPlanModeResponse's ToolResult
      return buildExitPlanModeResponse(planContent, planFilePath, isAgent);
    },

    approval: {
      category: 'ask',
      needsApproval: async () => true,
    },
  });
}
