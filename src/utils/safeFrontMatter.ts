import fm from 'front-matter';

const SIMPLE_VALUE_PATTERN = /^[a-zA-Z0-9_.\-\s]+$/;

function isSimpleValue(value: string): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return true;
  }
  return SIMPLE_VALUE_PATTERN.test(trimmed);
}

function fixFrontmatterValues(frontmatter: string): string {
  return frontmatter.replace(
    /^(\s*[a-zA-Z0-9_-]+\s*:\s*)(.+)$/gm,
    (match, keyPart, valuePart) => {
      if (isSimpleValue(valuePart)) {
        return match;
      }
      const trimmed = valuePart.trim();
      return `${keyPart}"${trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    },
  );
}

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
    try {
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (frontmatterMatch) {
        const originalFm = frontmatterMatch[1];
        const fixedFm = fixFrontmatterValues(originalFm);

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
