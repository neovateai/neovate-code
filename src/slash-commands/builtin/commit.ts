import { createGenerateCommitSystemPrompt } from '../../utils/commitPrompt';
import { TOOL_NAMES } from '../../constants';
import { isEnglish } from '../../utils/language';
import type { PromptCommand } from '../types';

export function createCommitCommand(language: string): PromptCommand {
  const useEnglish = isEnglish(language);
  const lang = useEnglish ? '' : ` Communicate in ${language}.`;

  return {
    type: 'prompt',
    name: 'commit',
    description: 'Generate commit message for staged changes',
    progressMessage: 'Generating commit message...',
    async getPromptForCommand(_args?: string) {
      const systemPrompt = createGenerateCommitSystemPrompt(language);
      const lockFiles = [
        'pnpm-lock.yaml',
        'package-lock.json',
        'yarn.lock',
        'bun.lockb',
        'Gemfile.lock',
        'Cargo.lock',
      ];
      const lockFilesPattern = lockFiles.map((file) => `':!${file}'`).join(' ');

      return [
        {
          role: 'user',
          content: `You are a Git commit assistant.${lang}

## System Prompt for Commit Generation
${systemPrompt}

## Instructions

Follow these steps:

1. First, check if there are staged changes using bash("git diff --cached --stat")
   - If no staged changes, inform the user and ask if they want to stage all changes using bash("git add -A")

2. Get the staged diff using bash("git --no-pager diff --cached -- . ${lockFilesPattern}")

3. Analyze the diff and generate commit information (commitMessage, branchName, isBreakingChange, summary)

4. Present the generated information to the user in a clear format:
   - Commit Message: <the generated message>
   - Branch Name: <suggested branch name>
   - Summary: <brief summary>
   - Breaking Change: Yes/No

5. Use ${TOOL_NAMES.ASK_USER_QUESTION} tool to let the user choose an action with these options:
   - "Commit" - Commit with the generated message
   - "Commit & Push" - Commit and push to remote
   - "Create Branch & Commit" - Create new branch with suggested name, then commit

6. Based on user's choice, execute the corresponding git commands:
   - Commit: bash("git commit -m '<commitMessage>'")
   - Push: bash("git push origin '<branchName>'")
   - Create Branch: bash("git checkout -b '<branchName>'")

7. If the user wants to modify the commit message or branch name before executing, allow them to provide a new value.

8. Report the result of each operation to the user.

Note: If any git command fails, explain the error and suggest possible solutions.`,
        },
      ];
    },
  };
}
