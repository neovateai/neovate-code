import type { PromptCommand } from '../types';

export const changelogCommand: PromptCommand = {
  type: 'prompt',
  name: 'changelog',
  description: 'List the latest two version updates',
  progressMessage: 'Reading and formatting changelog...',
  async getPromptForCommand(_args?: string) {
    const user = `You are a release notes expert. Please:

1) Use read("CHANGELOG.md") to read the project's changelog from the root directory.
2) Parse the two most recent version sections starting with "## x.y.z", and identify the date line immediately following (in the format \`YYYY-MM-DD\`).
3) Polish the original entries and output a more readable changelog in English:
   - For each version, use a title: add a suitable emoji at the beginning (e.g., 🚀/🎉), and apply ANSI colors to the "version" and "date":
     - Version: use \x1b[1m\x1b[97m (bright white bold), e.g., \x1b[1m\x1b[97m0.15.0\x1b[0m
     - Date: use \x1b[36m (cyan), e.g., \x1b[36m2025-11-02\x1b[0m
     - Title example: "🚀 Version \x1b[1m\x1b[97mx.y.z\x1b[0m (\x1b[36mYYYY-MM-DD\x1b[0m)"
   - List the changes below as concise bullet points, merging or deduplicating redundant information, and unifying verb style (e.g.: Added, Fixed, Improved, Refactored, Style, Dependencies, Docs).
   - Add intuitive emoji prefixes to each bullet:
     - Added: 🚀
     - Fixed: 🛠️
     - Improved: ✨
     - Refactored: ♻️
     - Style: 🎨
     - Dependencies: 📦
     - Docs: 📝
   - Keep key information (feature, scope, related PR number or author), remove noise and implementation details.
   - Output only the two most recent versions, nothing else.

Requirements:
- Language: Respond in the language specified by the user input.
- Tone: Professional and concise, easy to scan quickly.
- Structure: Block by version, title + bullet list.
`;
    return [
      {
        role: 'user',
        content: user,
      },
    ];
  },
};

export default changelogCommand;
