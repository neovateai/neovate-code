import defu from 'defu';
import { Context } from './context';

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

type PluginContext = Omit<
  Context,
  'destroy' | 'getModelProvider' | 'buildSystemPrompts' | 'addHistory'
>;

type AgentType = 'code' | 'plan';
type Enforce = 'pre' | 'post';

export type Plugin = {
  enforce?: Enforce;
  name?: string;
  config?: (this: PluginContext) => any | Promise<any> | null;
  configResolved?: (this: PluginContext, opts: { resolvedConfig: any }) => void;
  cliStart?: (this: PluginContext) => void;
  cliEnd?: (
    this: PluginContext,
    opts: { startTime: number; endTime: number; error?: any },
  ) => void;
  contextStart?: (this: PluginContext, opts: { prompt: string }) => void;
  context?: (this: PluginContext, opts: { prompt: string }) => void;
  toolUse?: (
    this: PluginContext,
    opts: { callId: string; name: string; params: any },
  ) => void;
  toolUseResult?: (
    this: PluginContext,
    opts: { callId: string; name: string; params: any; result: any },
  ) => void;
  query?: (
    this: PluginContext,
    opts: { text: string; parsed: any; input: any },
  ) => void;
  env?: (this: PluginContext) => Record<string, string>;
  model?: (
    this: PluginContext,
    opts: {
      modelName: string;
      aisdk: any;
      createOpenAI: any;
      createDeepSeek: any;
      createAnthropic: any;
    },
  ) => Promise<any>;
  tool?: (this: PluginContext, opts: { agentType: AgentType }) => Promise<any>;
  serverAppData?: (
    this: PluginContext,
    opts: { context: any; cwd: string },
  ) => Promise<any>;
  serverRoutes?: (
    this: PluginContext,
    opts: { app: any; prefix: string; opts: any },
  ) => void;
  serverRouteCompletions?: (
    this: PluginContext,
    opts: {
      message: {
        role: 'user';
        content: string;
        attachedContexts: any[];
        contextContent: string;
      };
      attachedContexts: any[];
    },
  ) => void;
};
