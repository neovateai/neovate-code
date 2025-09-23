import type { NormalizedMessage } from './message';
import type { ModelInfo } from './model';
import { query } from './query';

type CompactOptions = {
  messages: NormalizedMessage[];
  model: ModelInfo;
};

export const COMPACT_MESSAGE = `Chat history compacted successfully.`;

export async function compact(opts: CompactOptions): Promise<string> {
  const result = await query({
    messages: opts.messages,
    userPrompt: COMPACT_USER_PROMPT,
    systemPrompt: COMPACT_SYSTEM_PROMPT,
    model: opts.model,
  });
  if (result.success) {
    return result.data.text;
  }
  throw new Error(`Failed to compact: ${result.error.message}`);
}

const COMPACT_USER_PROMPT = `
Provide a detailed but concise summary of our conversation above. Focus on information that would be helpful for continuing the conversation, including what we did, what we're doing, which files we're working on, and what we're going to do next.
`;
const COMPACT_SYSTEM_PROMPT = `
You are a helpful AI assistant tasked with summarizing conversations.

When the conversation history grows too large, you will be invoked to distill the entire history into a concise, structured XML snapshot. This snapshot is CRITICAL, as it will become the agent's *only* memory of the past. The agent will resume its work based solely on this snapshot. All crucial details, plans, errors, and user directives MUST be preserved.

First, you will think through the entire history. Review the user's overall goal, the agent's actions, tool outputs, file modifications, and any unresolved questions. Identify every piece of information that is essential for future actions.

After your reasoning is complete, generate the final <context_summary> XML object. Be incredibly dense with information. Omit any irrelevant conversational filler.

The structure MUST be as follows:

<context_summary>
  <conversation_overview>
    <!-- Single paragraph overview of the entire conversation
    <!-- Example: "User requested implementation of a new authentication system using JWT,
                  with specific requirements for token expiration and refresh mechanisms." -->
  </conversation_overview>

  <key_knowledge>
      <!-- Crucial facts, conventions, and constraints the agent must remember based on the conversation history and interaction with the user. Use bullet points. -->
      <!-- Example:
        - Build Command: \`npm run build\`
        - Testing: Tests are run with \`npm test\`. Test files must end in \`.test.ts\`.
        - API Endpoint: The primary API endpoint is \`https://api.example.com/v2\`.

      -->
  </key_knowledge>

  <file_system_state>
      <!-- List files that have been created, read, modified, or deleted. Note their status and critical learnings. -->
      <!-- Example:
        - CWD: \`/home/user/project/src\`
        - READ: \`package.json\` - Confirmed 'axios' is a dependency.
        - MODIFIED: \`services/auth.ts\` - Replaced 'jsonwebtoken' with 'jose'.
        - CREATED: \`tests/new-feature.test.ts\` - Initial test structure for the new feature.
      -->
  </file_system_state>

  <recent_actions>
      <!-- A summary of the last few significant agent actions and their outcomes. Focus on facts. -->
      <!-- Example:
        - Ran \`grep 'old_function'\` which returned 3 results in 2 files.
        - Ran \`npm run test\`, which failed due to a snapshot mismatch in \`UserProfile.test.ts\`.
        - Ran \`ls -F static/\` and discovered image assets are stored as \`.webp\`.
      -->
  </recent_actions>

  <current_plan>
      <!-- The agent's step-by-step plan. Mark completed steps. -->
      <!-- Example:
        1. [DONE] Identify all files using the deprecated 'UserAPI'.
        2. [IN PROGRESS] Refactor \`src/components/UserProfile.tsx\` to use the new 'ProfileAPI'.
        3. [TODO] Refactor the remaining files.
        4. [TODO] Update tests to reflect the API change.
      -->
  </current_plan>
</context_summary>

Remember: This summary will serve as the foundation for continuing the conversation and implementation. Ensure all critical information is preserved while maintaining clarity and conciseness.
`;
