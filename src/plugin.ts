import { type AgentInputItem } from '@openai/agents';
import defu from 'defu';
import { type Config } from './config';
import { Context, type CreateContextOpts } from './context';
import { type MessageContent } from './utils/parse-message';
import { type UsageData } from './utils/usage';

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

// type PluginContext = Omit<
//   Context,
//   'destroy' | 'getModelProvider' | 'buildSystemPrompts' | 'addHistory'
// >;
type PluginContext = Context;

type TempPluginContext = CreateContextOpts & {
  pluginManager: PluginManager;
  config: Config;
  apply: (opts: PluginApplyOpts) => Promise<any> | any;
};

type AgentType = 'code' | 'plan';
type Enforce = 'pre' | 'post';

export type GeneralInfo = Record<
  string,
  | string
  | {
      enforce: Enforce;
      text: string;
    }
>;

type Status = Record<
  string,
  {
    description?: string;
    items: string[];
  }
>;

type ModelInfo = {
  label: string;
  value: string;
};

export type Plugin = {
  enforce?: Enforce;
  name?: string;
  config?: (
    this: TempPluginContext,
    opts: { config: Config },
  ) => any | Promise<any>;
  configResolved?: (
    this: TempPluginContext,
    opts: { resolvedConfig: any },
  ) => Promise<any> | any;
  generalInfo?: (this: TempPluginContext) => GeneralInfo | Promise<GeneralInfo>;
  cliStart?: (this: PluginContext) => Promise<any> | any;
  cliEnd?: (
    this: PluginContext,
    opts: { startTime: number; endTime: number; error?: any },
  ) => Promise<any> | any;
  contextStart?: (
    this: PluginContext,
    opts: { prompt: string },
  ) => Promise<any> | any;
  context?: (
    this: PluginContext,
    opts: { prompt: string },
  ) => Promise<any> | any;
  userPrompt?: (
    this: PluginContext,
    opts: { text: string; sessionId: string },
  ) => Promise<any> | any;
  systemPrompt?: (
    this: PluginContext,
    memo: string[],
    opts: { prompt: string | undefined },
  ) => Promise<string> | string;
  text?: (
    this: PluginContext,
    opts: { text: string; sessionId: string },
  ) => Promise<any> | any;
  query?: (
    this: PluginContext,
    opts: {
      text: string;
      parsed: MessageContent[];
      input: AgentInputItem[];
      model: string;
      usage: UsageData;
      sessionId: string;
    },
  ) => Promise<any> | any;
  conversation?: (
    this: PluginContext,
    opts: {
      prompt: string;
      finalText: string;
      history: AgentInputItem[];
      startTime: number;
      endTime: number;
    },
  ) => Promise<any> | any;
  destroy?: (this: PluginContext) => Promise<any> | any;
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
  ) => Promise<any> | any;
  serverAppData?: (
    this: PluginContext,
    opts: { context: any; cwd: string },
  ) => Promise<any> | any;
  serverRoutes?: (
    this: PluginContext,
    opts: { app: any; prefix: string; opts: any },
  ) => Promise<any> | any;
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
  ) => Promise<any> | any;
  command?: (this: PluginContext) => Promise<any[]> | any[];
  argvConfig?: (this: PluginContext) => Promise<any> | any;
  modelInfo?: (this: PluginContext) => Promise<any> | any;
  status?: (this: PluginContext) => Promise<Status> | Status;
  tool?: (this: PluginContext, opts: { agentType: AgentType }) => Promise<any>;
  toolUse?: (
    this: PluginContext,
    opts: { toolUse: any; sessionId: string },
  ) => Promise<any> | any;
  toolUseResult?: (
    this: PluginContext,
    // result: any,
    opts: {
      toolUse: any;
      result: any;
      sessionId: string;
    },
  ) => Promise<any> | any;
  modelList?: (
    this: PluginContext,
    models: ModelInfo[],
  ) => Promise<ModelInfo[]> | ModelInfo[];
  provider?: (this: PluginContext) => Promise<any> | any;
  modelAlias?: (this: PluginContext) => Promise<any> | any;
};
