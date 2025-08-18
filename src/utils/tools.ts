import { isZodObject } from '@openai/agents/utils';
import { z } from 'zod';

export function validateToolParams(schema: z.ZodObject<any>, params: string) {
  try {
    if (isZodObject(schema)) {
      const parsedParams = JSON.parse(params);
      const result = schema.safeParse(parsedParams);
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
