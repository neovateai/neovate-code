import type { OpenAIProvider } from '@ai-sdk/openai';
import type { AgentInputItem } from '@openai/agents';
import type { LanguageModelV1 } from '@openrouter/ai-sdk-provider';
import defu from 'defu';
import type { Config } from './config';
import type { Context, ContextCreateOpts } from './context';
import type { LoopResult } from './loop';
import type { ModelAlias, ModelMap, Provider, ProvidersMap } from './model';
import type { OutputStyle } from './outputStyle';
import type { SlashCommand } from './slash-commands/types';
import type { Tool, ToolResult, ToolUse } from './tool';
import type { Usage } from './usage';
import type { MessageContent } from './utils/parse-message';

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

type PluginContext = Context;

type TempPluginContext = ContextCreateOpts & {
  pluginManager: PluginManager;
  config: Config;
  apply: (opts: PluginApplyOpts) => Promise<any> | any;
};

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

export type Plugin = {
  enforce?: Enforce;
  name?: string;

  // initialize
  config?: (
    this: TempPluginContext,
    opts: { config: Config; argvConfig: Record<string, any> },
  ) => Partial<Config> | Promise<Partial<Config>>;
  slashCommand?: (
    this: PluginContext,
  ) => Promise<SlashCommand[]> | SlashCommand[];
  outputStyle?: (this: PluginContext) => Promise<OutputStyle[]> | OutputStyle[];
  provider?: (
    this: PluginContext,
    providers: ProvidersMap,
    opts: {
      models: ModelMap;
      defaultModelCreator: (
        name: string,
        provider: Provider,
      ) => LanguageModelV1;
      createOpenAI: (options: any) => OpenAIProvider;
    },
  ) => Promise<ProvidersMap> | ProvidersMap;
  modelAlias?: (
    this: PluginContext,
    modelAlias: ModelAlias,
  ) => Promise<ModelAlias> | ModelAlias;

  // workflow
  // NOTICE: initialized may be called multiple times when it's runned
  // for different file paths
  initialized?: (
    this: PluginContext,
    opts: {
      cwd: string;
      quiet: boolean;
    },
  ) => Promise<void> | void;
  destroy?: (this: PluginContext) => Promise<void> | void;

  // session
  context?: (
    this: PluginContext,
    opts: {
      userPrompt: string | null;
      sessionId: string;
    },
  ) => Promise<Record<string, string> | {}> | Record<string, string> | {};
  env?: (
    this: PluginContext,
    opts: {
      userPrompt: string | null;
      sessionId: string;
    },
  ) => Promise<Record<string, string> | {}> | Record<string, string> | {};
  userPrompt?: (
    this: PluginContext,
    userPrompt: string,
    opts: { sessionId: string },
  ) => Promise<string> | string;
  systemPrompt?: (
    this: PluginContext,
    systemPrompt: string,
    opts: { isPlan?: boolean; sessionId: string },
  ) => Promise<string> | string;
  tool?: (
    this: PluginContext,
    opts: { isPlan?: boolean; sessionId: string },
  ) => Promise<Tool[]> | Tool[];
  toolUse?: (
    this: PluginContext,
    toolUse: ToolUse,
    opts: { sessionId: string },
  ) => Promise<ToolUse> | ToolUse;
  toolResult?: (
    this: PluginContext,
    toolResult: ToolResult,
    opts: {
      toolUse: ToolUse;
      approved: boolean;
      sessionId: string;
    },
  ) => Promise<ToolResult> | ToolResult;
  query?: (
    this: PluginContext,
    opts: {
      usage: Usage;
      startTime: Date;
      endTime: Date;
      sessionId: string;
    },
  ) => Promise<void> | void;
  conversation?: (
    this: PluginContext,
    opts: {
      userPrompt: string | null;
      result: LoopResult;
      startTime: Date;
      endTime: Date;
      sessionId: string;
    },
  ) => Promise<void> | void;

  // slash commands
  // /status
  status?: (this: PluginContext) => Promise<Status> | Status;

  // Telemetry hook for collecting usage analytics
  telemetry?: (
    this: PluginContext,
    opts: {
      name: string;
      payload: Record<string, any>;
    },
  ) => Promise<void> | void;

  // server
  _serverAppData?: (
    this: PluginContext,
    opts: { context: any; cwd: string },
  ) => Promise<any> | any;
  _serverRoutes?: (
    this: PluginContext,
    opts: { app: any; prefix: string; opts: any },
  ) => Promise<any> | any;
  _serverRouteCompletions?: (
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
};
