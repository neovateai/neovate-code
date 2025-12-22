export const TASK_TOOL_NAME = 'task';
export const EDIT_TOOLS = ['edit', 'write'];

export function buildDisallowedTools(...toolGroups: string[][]): string[] {
  return Array.from(new Set(toolGroups.flat()));
}

export const CONTEXT_NOTES = `
IMPORTANT NOTES:
- Return file paths as absolute paths in your final response
- For clear communication, avoid using emojis
- Complete the task efficiently and report your findings clearly
`.trim();

export const THOROUGHNESS_LEVELS = `
Thoroughness levels:
- "quick": 1-2 search attempts, check common locations
- "medium": 3-5 search attempts, try multiple naming patterns
- "very thorough": Comprehensive search across multiple locations and conventions
`.trim();
