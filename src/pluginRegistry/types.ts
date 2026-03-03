import { z } from 'zod';

export const PluginSourceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('local'),
    path: z.string(),
  }),
  z.object({
    type: z.literal('git'),
    url: z.string().url(),
    ref: z.string().optional(),
    sha: z.string().optional(),
  }),
  z.object({
    type: z.literal('github'),
    repo: z.string().regex(/^[^/]+\/[^/]+$/),
    ref: z.string().optional(),
    sha: z.string().optional(),
  }),
  z.object({
    type: z.literal('npm'),
    package: z.string(),
    version: z.string().optional(),
  }),
]);
export type PluginSource = z.infer<typeof PluginSourceSchema>;

export const PluginScopeSchema = z.enum(['global', 'project', 'local']);
export type PluginScope = z.infer<typeof PluginScopeSchema>;

export const ManifestHookSchema = z.object({
  type: z.enum(['command', 'prompt']),
  command: z.string().optional(),
  prompt: z.string().optional(),
  timeout: z.number().optional(),
  statusMessage: z.string().optional(),
});

export const ManifestHookEntrySchema = z.object({
  matcher: z.string().optional(),
  hooks: z.array(ManifestHookSchema),
});

export const PluginManifestSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][-a-z0-9]*$/, 'Must use kebab-case'),
  version: z.string().optional(),
  description: z.string().optional(),
  author: z
    .union([
      z.string(),
      z.object({ name: z.string(), email: z.string().optional() }),
    ])
    .optional(),
  main: z.string().optional(),
  commands: z.union([z.string(), z.array(z.string())]).optional(),
  agents: z.union([z.string(), z.array(z.string())]).optional(),
  skills: z.array(z.string()).optional(),
  outputStyles: z.array(z.string()).optional(),
  mcpServers: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  hooks: z
    .union([z.string(), z.record(z.string(), z.array(ManifestHookEntrySchema))])
    .optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
});
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

export const InstalledPluginSchema = z.object({
  name: z.string(),
  source: PluginSourceSchema,
  scope: PluginScopeSchema,
  installPath: z.string(),
  version: z.string().optional(),
  marketplace: z.string().optional(),
  installedAt: z.string(),
  lastUpdated: z.string().optional(),
  gitCommitSha: z.string().optional(),
});
export type InstalledPlugin = z.infer<typeof InstalledPluginSchema>;

export const PluginRegistryFileSchema = z.object({
  version: z.literal(1),
  plugins: z.record(z.string(), InstalledPluginSchema),
});
export type PluginRegistryFile = z.infer<typeof PluginRegistryFileSchema>;
