import type { ZodError, ZodType } from 'zod';

export function isZodObject<T extends ZodType<unknown>>(schema: T): boolean {
  return 'safeParse' in schema && typeof schema.safeParse === 'function';
}

export function validateToolParams(
  schema: ZodType,
  params: unknown,
): { success: true } | { success: false; error: string } {
  const result = schema.safeParse(params);
  if (!result.success) {
    return {
      success: false,
      error: generateFixSuggestions(result.error),
    };
  }
  return { success: true };
}

function generateFixSuggestions(error: ZodError): string {
  const suggestions = error.issues.map((issue, index) => {
    const fieldPath =
      issue.path.length > 0 ? issue.path.join('.') : 'Root object';

    if (issue.code === 'invalid_type') {
      if (issue.message.includes('received undefined')) {
        return `${index + 1}. Field '${fieldPath}' is required but missing`;
      }

      const match = issue.message.match(/received (.+)$/);
      const received = match ? match[1] : 'unknown';

      return `${index + 1}. Field '${fieldPath}' expected ${issue.expected}, got ${received}`;
    }

    if (issue.code === 'too_small') {
      const minimum = issue.minimum;
      const typeHint = issue.message.toLowerCase().includes('string')
        ? ' characters'
        : issue.message.toLowerCase().includes('array')
          ? ' items'
          : '';
      return `${index + 1}. Field '${fieldPath}' must be at least ${minimum}${typeHint}`;
    }

    if (issue.code === 'too_big') {
      const maximum = issue.maximum;
      const typeHint = issue.message.toLowerCase().includes('string')
        ? ' characters'
        : issue.message.toLowerCase().includes('array')
          ? ' items'
          : '';
      return `${index + 1}. Field '${fieldPath}' must be at most ${maximum}${typeHint}`;
    }

    return `${index + 1}. Field '${fieldPath}': ${issue.message}`;
  });

  return `Parameter validation failed:\n\n${suggestions.join('\n')}\n\nPlease fix the parameters and try again.`;
}
