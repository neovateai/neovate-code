import { z } from 'zod';

const ContextSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  options: z.record(z.string(), z.any()),
});

const ToolUseSchema = z.object({
  toolName: z.string(),
  arguments: z.record(z.string(), z.string()),
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
          context: ContextSchema,
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
});

export type Plugin = z.infer<typeof PluginSchema>;
