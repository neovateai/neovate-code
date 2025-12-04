import fm from 'front-matter';

/**
 * Safely parse frontmatter from markdown content with automatic error recovery
 * Handles common YAML issues like unquoted colons in values
 * @param content - The markdown content with frontmatter
 * @param filePath - Optional file path for better error messages
 * @returns Parsed frontmatter attributes and body
 */
export function safeFrontMatter<T = Record<string, string>>(
  content: string,
  filePath?: string,
): { attributes: T; body: string } {
  try {
    const { attributes, body } = fm<T>(content);
    return { attributes, body };
  } catch (error) {
    // Try to fix common YAML issues
    // Issue 1: Colon in unquoted value (e.g. "name: OpenSpec: Proposal")
    try {
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (frontmatterMatch) {
        const originalFm = frontmatterMatch[1];
        const fixedFm = originalFm.replace(
          /^(\s*[a-zA-Z0-9_-]+\s*:\s+)(.*:\s+.*)$/gm,
          (match, keyPart, valuePart) => {
            const trimmed = valuePart.trim();
            if (
              (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
              (trimmed.startsWith("'") && trimmed.endsWith("'"))
            ) {
              return match;
            }
            return `${keyPart}"${trimmed.replace(/"/g, '\\"')}"`;
          },
        );

        if (fixedFm !== originalFm) {
          const fixedContent = content.replace(originalFm, fixedFm);
          const { attributes, body } = fm<T>(fixedContent);
          return { attributes, body };
        }
      }
    } catch {
      // Ignore retry errors
    }

    if (error instanceof Error) {
      const fileInfo = filePath ? ` ${filePath}` : '';
      error.message = `Failed to parse frontmatter${fileInfo}: ${error.message}`;
    }
    throw error;
  }
}
