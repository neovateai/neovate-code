import { z } from 'zod';

export interface Tool<T = any> {
  name: string;
  description: string;
  parameters: z.ZodSchema<T>;
  execute: (params: T) => Promise<any> | any;
  approval?: ToolApprovalInfo;
}

type ApprovalContext = {
  toolName: string;
  params: Record<string, any>;
  approvalMode: string;
  context: any;
};

type ToolApprovalInfo = {
  needsApproval?: (context: ApprovalContext) => Promise<boolean> | boolean;
  category?: 'read' | 'write' | 'command' | 'network';
};

export function createTool<TSchema extends z.ZodTypeAny>(config: {
  name: string;
  description: string;
  parameters: TSchema;
  execute: (params: z.infer<TSchema>) => Promise<any> | any;
  approval?: ToolApprovalInfo;
}): Tool<z.infer<TSchema>> {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    execute: config.execute,
    approval: config.approval,
  };
}

createTool({
  name: 'fetch',
  description: 'Fetch content from a URL',
  parameters: z.object({
    url: z.string(),
    prompt: z.string(),
  }),
  execute: async ({ url, prompt }) => {
    return {
      result: `Fetched content from ${url}`,
    };
  },
});
