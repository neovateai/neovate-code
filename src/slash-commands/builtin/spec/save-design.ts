import type { PromptCommand } from '../../types';

export function saveDesignCommand(language: string): PromptCommand {
  return {
    type: 'prompt',
    name: 'spec:save-design',
    description: 'Save design document',
    progressMessage: 'Saving design document from brainstorming session...',
    async getPromptForCommand() {
      return [
        {
          role: 'user',
          content: `
# Save Brainstorming Session as Design Document

The user has previously run /spec:brainstorm.
Your task is to:

1. Locate the /spec:brainstorm invocation in the current session conversation history.
2. Collect all user and assistant messages AFTER that command.
3. Analyze the conversation to infer the main feature/topic being designed.
4. Transform the brainstorming content into a cohesive design document with clear sections.
5. Generate a short, descriptive slug (3-5 words, lowercase, hyphen-separated) from the main topic.
6. Get the current date in YYYY-MM-DD format.
7. Construct the filename as docs/designs/YYYY-MM-DD-<slug>.md.
8. If a file with that name already exists, adjust by either appending a suffix like -1, -2 or a short timestamp.
9. If the docs/designs directory does not exist, create it.
10. Use the write tool to create the file with the generated filename and design content.
11. At the end, print the final file path you wrote to.

If no /spec:brainstorm command is found in the history, clearly tell the user that no brainstorming session could be detected and do not write any file.

The design document MUST follow this structure:

# [Feature Name]

**Date:** YYYY-MM-DD

## Context
Summarize the initial idea and motivation based on the early brainstorming messages.

## Discussion
Summarize key questions, answers, trade-offs, and explored alternatives from the conversation.

## Approach
Summarize the final agreed direction and how it solves the problem.

## Architecture
Describe technical details, components, flows, and important implementation notes if discussed.

Remember:
- Base everything only on content after /spec:brainstorm.
- Do not include raw chat logs; only the distilled design.
- Respond in ${language}.
      `.trim(),
        },
      ];
    },
  } as PromptCommand;
}
