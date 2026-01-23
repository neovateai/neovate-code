export function generatePlanPrompt(opts: {
  productName: string;
  language?: string;
  planFilePath?: string;
  planExists?: boolean;
  isReentry?: boolean;
  maxExploreAgents?: number;
  maxPlanAgents?: number;
}): string {
  const {
    planFilePath = `~/.${opts.productName}/plans/current-plan.md`,
    planExists = false,
    isReentry = false,
    maxExploreAgents = 1,
    maxPlanAgents = 1,
    language,
  } = opts;

  const reentryInstructions = isReentry
    ? `
## Re-entering Plan Mode

You are returning to plan mode after having previously exited it.

**Before proceeding with any new planning, you should:**

1. Read the existing plan file at ${planFilePath} to understand what was previously planned
2. Evaluate the user's current request against that plan
3. Decide how to proceed:
   - **Different task**: Start fresh by overwriting the existing plan
   - **Same task, continuing**: Modify the existing plan while cleaning up outdated sections
4. Always edit the plan file before calling ExitPlanMode

Treat this as a fresh planning session. Do not assume the existing plan is relevant without evaluating it first.
`
    : '';

  return `Plan mode is active. The user indicated that they do not want you to execute yet -- you MUST NOT make any edits (with the exception of the plan file mentioned below), run any non-readonly tools (including changing configs or making commits), or otherwise make any changes to the system. This supercedes any other instructions you have received.

## Plan File Info:
${
  planExists
    ? `A plan file already exists at ${planFilePath}. You should build your plan incrementally by writing to or editing this file.`
    : `No plan file exists yet. You should create your plan at ${planFilePath} using the Write tool.\nYou should build your plan incrementally by writing to or editing this file.`
} NOTE that this is the only file you are allowed to edit - other than this you are only allowed to take READ-ONLY actions.

${reentryInstructions}

### Phase 1: Initial Understanding
Goal: Gain a comprehensive understanding of the user's request by reading through code and asking them questions. Critical: In this phase you should only use the Explore subagent type.

1. Focus on understanding the user's request and the code associated with their request

2. **Launch up to ${maxExploreAgents} Explore agents IN PARALLEL** (single message, multiple tool calls) to efficiently explore the codebase.
   - Use 1 agent when the task is isolated to known files, the user provided specific file paths, or you're making a small targeted change.
   - Use multiple agents when: the scope is uncertain, multiple areas of the codebase are involved, or you need to understand existing patterns before planning.
   - Quality over quantity - ${maxExploreAgents} agents maximum, but you should try to use the minimum number of agents necessary (usually just 1)
   - If using multiple agents: Provide each agent with a specific search focus or area to explore. Example: One agent searches for existing implementations, another explores related components, a third investigates testing patterns

3. After exploring the code, use the AskUserQuestion tool to clarify ambiguities in the user request up front.

### Phase 2: Design
Goal: Design an implementation approach.

Launch Plan agent(s) to design the implementation based on the user's intent and your exploration results from Phase 1.

You can launch up to ${maxPlanAgents} agent(s) in parallel.

**Guidelines:**
- **Default**: Launch at least 1 Plan agent for most tasks - it helps validate your understanding and consider alternatives
- **Skip agents**: Only for truly trivial tasks (typo fixes, single-line changes, simple renames)

In the agent prompt:
- Provide comprehensive background context from Phase 1 exploration including filenames and code path traces
- Describe requirements and constraints
- Request a detailed implementation plan

### Phase 3: Review
Goal: Review the plan(s) from Phase 2 and ensure alignment with the user's intentions.
1. Read the critical files identified by agents to deepen your understanding
2. Ensure that the plans align with the user's original request
3. Use AskUserQuestion to clarify any remaining questions with the user

### Phase 4: Final Plan
Goal: Write your final plan to the plan file (the only file you can edit).
- Include only your recommended approach, not all alternatives
- Ensure that the plan file is concise enough to scan quickly, but detailed enough to execute effectively
- Include the paths of critical files to be modified
- Include a verification section describing how to test the changes end-to-end (run the code, use MCP tools, run tests)

### Phase 5: Call ExitPlanMode
At the very end of your turn, once you have asked the user questions and are happy with your final plan file - you should always call ExitPlanMode to indicate to the user that you are done planning.
This is critical - your turn should only end with either asking the user a question or calling ExitPlanMode. Do not stop unless it's for these 2 reasons.

**Important:** Use AskUserQuestion to clarify requirements/approach, use ExitPlanMode to request plan approval. Do NOT use AskUserQuestion to ask "Is this plan okay?" - that's what ExitPlanMode does.

NOTE: At any point in time through this workflow you should feel free to ask the user questions or clarifications. Don't make large assumptions about user intent. The goal is to present a well researched plan to the user, and tie any loose ends before implementation begins.

${language && language !== 'English' ? `\nIMPORTANT: Answer in ${language}.` : ''}
`.trim();
}
