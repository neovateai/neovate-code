import defu from 'defu';
import { z } from 'zod';

export enum PluginHookType {
  First = 'first',
  Series = 'series',
  SeriesMerge = 'seriesMerge',
  SeriesLast = 'seriesLast',
  Parallel = 'parallel',
}

export type PluginApplyOpts = {
  hook: keyof Plugin;
  args: any[];
  memo?: any;
  type: PluginHookType;
  pluginContext: any;
};

export class PluginManager {
  #plugins: Plugin[] = [];
  constructor(rawPlugins: Plugin[]) {
    this.#plugins = [
      ...rawPlugins.filter((p) => p.enforce === 'pre'),
      ...rawPlugins.filter((p) => !p.enforce),
      ...rawPlugins.filter((p) => p.enforce === 'post'),
    ];
  }

  async apply({
    hook,
    args,
    memo,
    type = PluginHookType.Series,
    pluginContext,
  }: PluginApplyOpts) {
    const plugins = this.#plugins.filter((p) => !!p[hook]);
    if (type === PluginHookType.First) {
      for (const plugin of plugins) {
        const hookFn: any = plugin[hook];
        if (typeof hookFn === 'function') {
          const result = await hookFn.apply(pluginContext, args);
          if (result != null) {
            return result;
          }
        }
      }
      return null;
    } else if (type === PluginHookType.Parallel) {
      const results = await Promise.all(
        plugins.map((p) => {
          const hookFn: any = p[hook];
          if (typeof hookFn === 'function') {
            return hookFn.apply(pluginContext, args);
          }
          return null;
        }),
      );
      return results.filter((r) => r != null);
    } else if (type === PluginHookType.Series) {
      for (const plugin of plugins) {
        const hookFn: any = plugin[hook];
        if (typeof hookFn === 'function') {
          await hookFn.apply(pluginContext, args);
        }
      }
    } else if (type === PluginHookType.SeriesLast) {
      let result = memo;
      for (const plugin of plugins) {
        const hookFn: any = plugin[hook];
        if (typeof hookFn === 'function') {
          result = await hookFn.apply(pluginContext, [result, ...args]);
        }
      }
      return result;
    } else if (type === PluginHookType.SeriesMerge) {
      let result = memo;
      const isArray = Array.isArray(result);
      for (const plugin of plugins) {
        const hookFn: any = plugin[hook];
        if (typeof hookFn === 'function') {
          if (isArray) {
            result = result.concat(await hookFn.apply(pluginContext, args));
          } else {
            result = defu(await hookFn.apply(pluginContext, args), result);
          }
        }
      }
      return result;
    } else {
      throw new Error(`Invalid hook type: ${type}`);
    }
  }
}

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
          error: z.any().optional(),
        }),
      ]),
      z.void(),
    )
    .optional(),
});

type InferedPlugin = z.infer<typeof PluginSchema>;
type AddThisToMethods<T, ThisType> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer Return
    ? (this: ThisType, ...args: Args) => Return
    : T[K];
};
export type Plugin = AddThisToMethods<InferedPlugin, any>;
// export type Plugin = InferedPlugin;
