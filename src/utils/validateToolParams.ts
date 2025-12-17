import type * as z from 'zod';

/**
 * Check if a schema is a valid Zod object
 */
export function isZodObject(schema: any): schema is z.ZodTypeAny {
  return schema && typeof schema.safeParse === 'function';
}

/**
 * Validate tool parameters using Zod schema
 * Returns validation result with helpful error messages for LLM to auto-fix
 */
export function validateToolParams(
  schema: z.ZodTypeAny,
  params: any,
): { success: true } | { success: false; error: string } {
  if (!isZodObject(schema)) {
    return { success: true }; // Skip validation for non-Zod schemas
  }

  let result;
  try {
    result = schema.safeParse(params);
  } catch (error) {
    // Catch any errors during parsing itself
    return {
      success: false,
      error: `Parameter validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (result.success) {
    return { success: true };
  }

  // Generate helpful error messages for LLM to understand and fix
  try {
    // Safely handle issues array - add defensive check
    const issues = Array.isArray(result.error.issues)
      ? result.error.issues
      : [];

    if (issues.length === 0) {
      return {
        success: false,
        error: `Parameter validation failed: ${result.error.message || 'Unknown error'}`,
      };
    }

    const errorMessages = issues.map((issue, index) => {
      try {
        const path =
          issue.path && issue.path.length > 0
            ? issue.path.map(String).join('.')
            : 'root';
        let message = `${index + 1}. Field '${path}': `;

        if (issue.code === 'invalid_type') {
          const received = (issue as any).received;
          const expected = (issue as any).expected;

          if (received === 'undefined') {
            message += `Required field is missing`;
            message += `\n   Expected type: ${expected}`;
            message += `\n   Suggestion: Provide a valid ${expected} value`;
          } else {
            message += `Type mismatch`;
            message += `\n   Expected: ${expected}`;
            message += `\n   Received: ${received}`;
            // Add specific suggestions for common type conversions
            if (expected === 'string' && received === 'number') {
              message += `\n   Suggestion: Convert to string (e.g., "${received}" instead of ${received})`;
            } else if (expected === 'number' && received === 'string') {
              message += `\n   Suggestion: Convert to number (remove quotes)`;
            } else if (expected === 'boolean' && received === 'string') {
              message += `\n   Suggestion: Use boolean value (true or false without quotes)`;
            }
          }
        } else if (issue.code === 'too_small') {
          const minimum = (issue as any).minimum;
          message += `Value is too small`;
          message += `\n   Minimum allowed: ${minimum}`;
          message += `\n   Suggestion: Provide a value >= ${minimum}`;
        } else if (issue.code === 'too_big') {
          const maximum = (issue as any).maximum;
          message += `Value is too large`;
          message += `\n   Maximum allowed: ${maximum}`;
          message += `\n   Suggestion: Provide a value <= ${maximum}`;
        } else {
          // Handle other validation errors including enum values
          message += issue.message || 'validation failed';
          // Add allowed values hint for enum-like errors if available
          const options = (issue as any).options;
          if (options && Array.isArray(options)) {
            message += `\n   Allowed values: ${options.join(', ')}`;
          }
        }

        return message;
      } catch (err) {
        // Fallback for individual issue formatting errors
        return `${index + 1}. Validation error: ${issue.message || 'unknown'}`;
      }
    });

    const errorMessage = `Parameter validation failed:\n\n${errorMessages.join('\n\n')}\n\nPlease correct these parameters according to the tool's schema and try again.`;

    return {
      success: false,
      error: errorMessage,
    };
  } catch (error) {
    // Fallback if error formatting itself fails
    return {
      success: false,
      error: `Parameter validation failed: ${result.error.message || 'Unable to format error details'}`,
    };
  }
}

/**
 * Sanitize parameters by providing default values for common issues
 * This helps when LLM provides slightly incorrect parameters
 */
export function sanitizeToolParams(schema: z.ZodTypeAny, params: any): any {
  if (!isZodObject(schema)) {
    return params;
  }

  // First try to parse as-is
  let result;
  try {
    result = schema.safeParse(params);
    if (result.success) {
      return result.data; // Return parsed data with defaults applied
    }
  } catch (error) {
    // If parsing throws, return original params
    return params;
  }

  // If validation fails, try to fix common issues
  const sanitized = { ...params };

  try {
    // Safely handle issues array
    const issues = Array.isArray(result.error.issues)
      ? result.error.issues
      : [];

    issues.forEach((issue) => {
      try {
        if (issue.code === 'invalid_type' && issue.path) {
          const path = issue.path.map(String) as (string | number)[];
          const expected = (issue as any).expected;
          const received = (issue as any).received;

          // Try to convert types
          if (expected === 'string' && received === 'number') {
            setNestedValue(
              sanitized,
              path,
              String(getNestedValue(params, path)),
            );
          } else if (expected === 'number' && received === 'string') {
            const value = getNestedValue(params, path);
            const parsed = Number(value);
            if (!isNaN(parsed)) {
              setNestedValue(sanitized, path, parsed);
            }
          } else if (expected === 'boolean' && received === 'string') {
            const value = getNestedValue(params, path);
            setNestedValue(
              sanitized,
              path,
              value === 'true' || value === '1' || value === 'yes',
            );
          }
        }
      } catch (err) {
        // Skip this issue if we can't process it
      }
    });
  } catch (error) {
    // If any error occurs during sanitization, return original params
    return params;
  }

  // Try again with sanitized values
  try {
    const retryResult = schema.safeParse(sanitized);
    return retryResult.success ? retryResult.data : params;
  } catch (error) {
    return params;
  }
}

// Helper functions for nested object access
function getNestedValue(obj: any, path: (string | number)[]): any {
  return path.reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj: any, path: (string | number)[], value: any): void {
  const lastKey = path[path.length - 1];
  const parent = path
    .slice(0, -1)
    .reduce((current, key) => current?.[key], obj);
  if (parent) {
    parent[lastKey] = value;
  }
}
