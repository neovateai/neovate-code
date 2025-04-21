import { z } from 'zod';

export const PluginSchema = z.object({
  enforce: z.enum(['pre', 'post']).optional(),
  name: z.string().optional(),
  config: z
    .function(
      z.tuple([z.object({ command: z.string() })]),
      z.union([z.any(), z.promise(z.any()), z.null()]),
    )
    .optional(),
  configResolved: z.function(z.tuple([z.any()]), z.void()).optional(),
});

export type Plugin = z.infer<typeof PluginSchema>;
