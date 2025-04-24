import { z } from 'zod';

const ToolUseSchema = z.object({
  toolName: z.string(),
  arguments: z.record(z.string(), z.string()),
});

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const PluginSchema = z.object({
  enforce: z.enum(['pre', 'post']).optional(),
  name: z.string().optional(),
  config: z
    .function(z.tuple([]), z.union([z.any(), z.promise(z.any()), z.null()]))
    .optional(),
  configResolved: z
    .function(z.tuple([z.object({ resolvedConfig: z.any() })]), z.void())
    .optional(),
  cliStart: z.function(z.tuple([]), z.void()).optional(),
  cliEnd: z
    .function(
      z.tuple([
        z.object({
          startTime: z.number(),
          endTime: z.number(),
        }),
      ]),
      z.void(),
    )
    .optional(),
  toolStart: z
    .function(z.tuple([z.object({ toolUse: ToolUseSchema })]), z.void())
    .optional(),
  toolEnd: z
    .function(
      z.tuple([
        z.object({
          toolUse: ToolUseSchema,
          startTime: z.number(),
          endTime: z.number(),
        }),
      ]),
      z.void(),
    )
    .optional(),
  queryStart: z
    .function(z.tuple([z.object({ prompt: z.string() })]), z.void())
    .optional(),
  query: z
    .function(z.tuple([z.object({ prompt: z.string() })]), z.void())
    .optional(),
  queryEnd: z
    .function(
      z.tuple([
        z.object({
          prompt: z.string(),
          systemPrompt: z.array(z.string()),
          queryContext: z.record(z.string(), z.any()),
          tools: z.record(z.string(), z.any()),
          messages: z.array(MessageSchema),
          startTime: z.number(),
          endTime: z.number(),
        }),
      ]),
      z.void(),
    )
    .optional(),
});

export type Plugin = z.infer<typeof PluginSchema>;
