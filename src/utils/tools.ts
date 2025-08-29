import { isZodObject } from '@openai/agents/utils';
import { z } from 'zod';
import type { EnhancedTool, ToolValidationResult } from '../tool';

export type ToolUse = {
  name: string;
  params: Record<string, any>;
  callId: string;
};

export function validateToolParams(
  schema: z.ZodObject<any>,
  params: Record<string, any>,
) {
  try {
    if (isZodObject(schema)) {
      const result = schema.safeParse(params);
      if (!result.success) {
        return {
          success: false,
          error: `Parameter validation failed: ${result.error.message}`,
        };
      }
      return {
        success: true,
        message: 'Tool parameters validated successfully',
      };
    }
    return {
      success: true,
      message: 'Tool parameters validated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error,
    };
  }
}

export function generateEnhancedErrorMessage(
  toolUse: ToolUse,
  validationError: NonNullable<ToolValidationResult['error']>,
  tool: EnhancedTool,
): string {
  const { type, message, details } = validationError;

  // Generate contextual error explanation
  let errorExplanation = '';
  let fixSuggestions = '';
  let exampleUsage = '';

  switch (type) {
    case 'tool_not_found':
      errorExplanation = `Tool '${toolUse.name}' not found. Please check if the tool name is correct.`;
      fixSuggestions = 'Please retry with the correct tool name.';
      break;

    case 'schema_validation_failed':
      errorExplanation = `Parameter validation failed for tool '${toolUse.name}'.`;
      if (details?.validationErrors && details.validationErrors.length > 0) {
        const errors = details.validationErrors.join(', ');
        errorExplanation += `\nSpecific errors: ${errors}`;
      }

      // Generate parameter suggestions based on schema
      if (tool && tool.type === 'function' && tool.parameters) {
        const schema = tool.parameters;
        const requiredFields = (schema as any).required || [];
        const properties = (schema as any).properties || {};

        fixSuggestions = 'Parameter fix suggestions:\n';

        // Check for missing required parameters
        const providedParams = Object.keys(details?.providedParams || {});
        const missingRequired = requiredFields.filter(
          (field: string) => !providedParams.includes(field),
        );
        if (missingRequired.length > 0) {
          fixSuggestions += `- Missing required parameters: ${missingRequired.join(', ')}\n`;
        }

        // Check parameter types
        for (const [paramName, paramSchema] of Object.entries(properties)) {
          const providedValue = details?.providedParams?.[paramName];
          if (providedValue !== undefined) {
            const expectedType = (paramSchema as any).type;
            const actualType = typeof providedValue;
            if (expectedType && expectedType !== actualType) {
              fixSuggestions += `- Parameter '${paramName}' type error: expected ${expectedType}, got ${actualType}\n`;
            }
          }
        }

        // Generate example usage
        exampleUsage = generateExampleUsage(toolUse.name, schema);
      } else {
        fixSuggestions =
          'No specific parameter schema available. Please check the tool documentation for correct parameter format.';
      }
      break;

    case 'invalid_parameters':
      errorExplanation = `Invalid parameters for tool '${toolUse.name}'.`;
      fixSuggestions =
        'Please check if the parameter format and types are correct.';
      break;
  }

  return `
## Tool Call Error Analysis

**Error Type**: ${type}
**Tool Name**: ${toolUse.name}
**Error Description**: ${errorExplanation}

**Currently Provided Parameters**:
\`\`\`json
${JSON.stringify(toolUse.params, null, 2)}
\`\`\`

**Fix Suggestions**:
${fixSuggestions}

${exampleUsage ? `**Correct Usage Example**:\n${exampleUsage}` : ''}

**System Error Message**: ${message}

Please fix the parameters based on the above analysis and retry. Ensure all required parameters are provided and parameter types and formats meet the tool requirements.

<error>
${JSON.stringify({
  id: toolUse.callId,
  name: toolUse.name,
  input: toolUse.params,
  result: message,
  isError: true,
  errorType: type,
  validationDetails: details,
})}
</error>
`.trim();
}

function generateExampleUsage(toolName: string, schema: any): string {
  if (!schema || !schema.properties) {
    return '';
  }

  const properties = schema.properties;
  const required = schema.required || [];
  const exampleParams: Record<string, any> = {};

  // Generate example values based on parameter types
  for (const [paramName, paramSchema] of Object.entries(properties)) {
    const param = paramSchema as any;

    if (param.type === 'string') {
      if (param.description?.includes('path') || paramName.includes('path')) {
        exampleParams[paramName] = '/path/to/file.txt';
      } else if (
        param.description?.includes('pattern') ||
        paramName.includes('pattern')
      ) {
        exampleParams[paramName] = '*.js';
      } else {
        exampleParams[paramName] = param.example || 'example_value';
      }
    } else if (param.type === 'number') {
      exampleParams[paramName] = param.example || 10;
    } else if (param.type === 'boolean') {
      exampleParams[paramName] = param.example || true;
    } else if (param.type === 'array') {
      exampleParams[paramName] = param.example || ['item1', 'item2'];
    } else if (param.type === 'object') {
      exampleParams[paramName] = param.example || {};
    } else {
      exampleParams[paramName] = param.example || null;
    }
  }

  return `
\`\`\`xml
<use_tool>
  <tool_name>${toolName}</tool_name>
  <arguments>
${JSON.stringify(exampleParams, null, 4)}
  </arguments>
</use_tool>
\`\`\``;
}
