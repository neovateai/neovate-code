import type { PromptCommand } from '../types';

export function createReviewCommand() {
  return {
    type: 'prompt',
    name: 'review',
    description: 'Review a pull request or staged changes',
    progressMessage: 'Analyzing changes...',
    async getPromptForCommand(args?: string) {
      const prNumber = args?.trim();
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
          content: `You are an expert code reviewer. Follow these steps:

1. If no PR number is provided in the args, use bash("git --no-pager diff --cached -- . ${lockFilesPattern}") to get the diff
2. If a PR number is provided, use bash("gh pr diff <number>") to get the diff
3. Analyze the changes and provide a thorough code review that includes:
   - Overview of what the PR does
   - Analysis of code quality and style
   - Specific suggestions for improvements
   - Any potential issues or risks

Keep your review concise but thorough. Focus on:
- Code quality and maintainability
- Security vulnerabilities
- Performance implications
- Test coverage
- Documentation completeness
- Breaking changes
- Consistency with codebase patterns

Format your review with clear sections and bullet points.

PR number: ${prNumber || 'not provided'}`,
        },
      ];
    },
  } as PromptCommand;
}
