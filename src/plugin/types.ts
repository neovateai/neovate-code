import { z } from 'zod';

export const PluginSchema = z.object({
  enforce: z.enum(['pre', 'post']).optional(),
  name: z.string().optional(),
  buildStart: z
    .function(z.tuple([z.object({ command: z.string() })]), z.void())
    .optional(),
  buildEnd: z
    .function(
      z.tuple([z.object({ command: z.string(), err: z.any().optional() })]),
      z.void(),
    )
    .optional(),
  configureBundler: z.function(z.tuple([]), z.any()).optional(),
  configResolved: z.function(z.tuple([z.any()]), z.void()).optional(),
  configureServer: z
    .function(
      z.tuple([z.object({ middlewares: z.any() })]),
      z.union([z.any(), z.promise(z.any()), z.null()]),
    )
    .optional(),
  transformIndexHtml: z
    .function(
      z.tuple([z.string(), z.any()]),
      z.union([z.string(), z.promise(z.string()), z.null()]),
    )
    .optional(),
  watchChange: z
    .function(
      z.tuple([
        z.string(),
        z.object({ event: z.enum(['create', 'update', 'delete']) }),
      ]),
      z.void(),
    )
    .optional(),
});

export type Plugin = z.infer<typeof PluginSchema>;
