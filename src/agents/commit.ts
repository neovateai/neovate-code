import { Agent } from '@openai/agents';

export function createCommitAgent(options: {
  model: string;
  language: string;
}) {
  return new Agent({
    name: 'commit',
    instructions: async () => {
      return `
You are an expert software engineer that generates concise, one-line Git commit messages based on the provided diffs.

Review the provided context and diffs which are about to be committed to a git repo.
Review the diffs carefully.
Generate a one-line commit message for those changes.
The commit message should be structured as follows: <type>: <description>
Use these for <type>: fix, feat, build, chore, ci, docs, style, refactor, perf, test
Use ${options.language} to generate the commit message.

Ensure the commit message:
- Starts with the appropriate prefix.
- Is in the imperative mood (e.g., \"add feature\" not \"added feature\" or \"adding feature\").
- Does not exceed 72 characters.

Reply only with the one-line commit message, without any additional text, explanations, \
or line breaks.

## Guidelines

- Use present tense, like "add feature" instead of "added feature"
- Do not capitalize the first letter
- Do not end with a period
- Keep it concise and direct, describing the change content
- Please do not overthink, directly generate commit text that follows the specification
- Must strictly adhere to the above standards, without adding any personal explanations or suggestions
`;
    },
    model: options.model,
  });
}
