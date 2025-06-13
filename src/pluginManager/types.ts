import { z } from 'zod';
import { PluginContext } from '../types';

const ToolUseSchema = z.object({
  toolName: z.string(),
  arguments: z.record(z.string(), z.string()),
});

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const CommandSchema = z.object({
  name: z.string(),
  description: z.string(),
  fn: z.function(z.tuple([]), z.any()),
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
  generalInfo: z.function(z.tuple([]), z.any()).optional(),
  cliStart: z.function(z.tuple([]), z.void()).optional(),
  cliEnd: z
    .function(
      z.tuple([
        z.object({
          startTime: z.number(),
          endTime: z.number(),
          error: z.any().optional(),
        }),
      ]),
      z.void(),
    )
    .optional(),
  toolStart: z
    .function(
      z.tuple([z.object({ toolUse: ToolUseSchema, queryId: z.string() })]),
      z.void(),
    )
    .optional(),
  toolEnd: z
    .function(
      z.tuple([
        z.object({
          toolUse: ToolUseSchema,
          startTime: z.number(),
          endTime: z.number(),
          queryId: z.string(),
        }),
      ]),
      z.void(),
    )
    .optional(),
  contextStart: z
    .function(z.tuple([z.object({ prompt: z.string() })]), z.void())
    .optional(),
  context: z
    .function(z.tuple([z.object({ prompt: z.string() })]), z.void())
    .optional(),
  editFile: z
    .function(
      z.tuple([
        z.object({
          filePath: z.string(),
          oldContent: z.string(),
          newContent: z.string(),
        }),
      ]),
      z.void(),
    )
    .optional(),
  createFile: z
    .function(
      z.tuple([z.object({ filePath: z.string(), content: z.string() })]),
      z.void(),
    )
    .optional(),
  queryStart: z
    .function(
      z.tuple([
        z.object({
          prompt: z.string(),
          id: z.string(),
          system: z.array(z.string()),
          tools: z.record(z.string(), z.any()),
        }),
      ]),
      z.void(),
    )
    .optional(),
  query: z
    .function(
      z.tuple([
        z.object({
          prompt: z.string(),
          text: z.string(),
          id: z.string(),
          generationId: z.string(),
          tokenUsage: z.object({
            promptTokens: z.number(),
            completionTokens: z.number(),
            totalTokens: z.number(),
          }),
        }),
      ]),
      z.void(),
    )
    .optional(),
  streamTextUpdate: z
    .function(
      z.tuple([z.object({ chunk: z.string(), queryId: z.string() })]),
      z.void(),
    )
    .optional(),
  message: z
    .function(
      z.tuple([
        z.object({ messages: z.array(MessageSchema), queryId: z.string() }),
      ]),
      z.void(),
    )
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
          id: z.string(),
          text: z.string(),
        }),
      ]),
      z.void(),
    )
    .optional(),
  commands: z.function(z.tuple([]), z.array(CommandSchema)).optional(),
});

type InferedPlugin = z.infer<typeof PluginSchema>;
type AddThisToMethods<T, ThisType> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer Return
    ? (this: ThisType, ...args: Args) => Return
    : T[K];
};
// TODO: fix this context don't work
export type Plugin = AddThisToMethods<InferedPlugin, PluginContext>;

export type Command = z.infer<typeof CommandSchema>;
