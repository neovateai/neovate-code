import defu from 'defu';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import resolve from 'resolve';
import yargsParser from 'yargs-parser';
import { MODEL_ALIAS, ModelType } from './llms/model';
import type { Plugin } from './pluginManager/types';
import { getSystemPrompt } from './prompts/prompts';
import { type ApprovalMode, getApprovalMode } from './utils/approvalMode';
import * as logger from './utils/logger';

export type ApiKeys = Record<string, string>;

const require = createRequire(import.meta.url);

export type Config = {
  model: ModelType;
  smallModel: ModelType;
  stream: boolean;
  mcpConfig: any;
  systemPrompt: string[];
  tasks: boolean;
  plugins: Plugin[];
  // TODO: why productName is in the config?
  productName: string;
  language: string;
  apiKeys: ApiKeys;
  approvalMode: ApprovalMode;
  printTokenUsage: boolean;
  quiet: boolean;
};

export function getConfigPaths(opts: { productName: string; cwd: string }): {
  globalConfigPath: string;
  projectConfigPath: string;
} {
  const { productName, cwd } = opts;
  const productNameLower = productName.toLowerCase();

  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const globalConfigPath = path.join(
    homeDir,
    `.${productNameLower}`,
    'config.json',
  );

  const projectConfigPath = path.join(
    cwd,
    `.${productNameLower}`,
    'config.json',
  );

  return { globalConfigPath, projectConfigPath };
}

function readConfigFile(filePath: string): Partial<Config> {
  if (fs.existsSync(filePath)) {
    try {
      const configContent = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(configContent);
      const mcpConfig = readMcpConfig(filePath);
      if (mcpConfig) {
        config.mcpConfig = mcpConfig;
      }
      return config;
    } catch (error: any) {
      logger.logWarn(
        `Unable to read config file ${filePath}: ${error.message}`,
      );
    }
  }
  return {};
}

function readMcpConfig(filePath: string): Record<string, any> | undefined {
  const mcpJson = path.join(path.dirname(filePath), 'mcp.json');
  if (fs.existsSync(mcpJson)) {
    try {
      return JSON.parse(fs.readFileSync(mcpJson, 'utf-8'));
    } catch (error: any) {
      logger.logWarn(
        `Unable to read mcp config file ${mcpJson}: ${error.message}`,
      );
    }
  }
}

export async function getConfig(opts: {
  argv: yargsParser.Arguments;
  productName: string;
  cwd: string;
}): Promise<Config> {
  const { argv, productName, cwd } = opts;

  const { globalConfigPath, projectConfigPath } = getConfigPaths({
    productName,
    cwd,
  });
  const globalConfig = readConfigFile(globalConfigPath);
  const projectConfig = readConfigFile(projectConfigPath);
  const argvConfig = {
    model: argv.model,
    smallModel: argv.smallModel,
    stream: argv.stream,
    mcpConfig: {
      mcpServers: (() => {
        if (argv.mcp) {
          const mcpValues = argv.mcp;
          const mcpServers = stringToMcpServerConfigs(mcpValues);
          logger.logDebug(`Using MCP servers from command line: ${mcpValues}`);
          return mcpServers;
        }
        return [];
      })(),
    },
    // systemPrompt: argv.systemPrompt,
    tasks: argv.tasks,
    plugins: argv.plugin,
    language: argv.language,
    approvalMode: argv.approvalMode,
    printTokenUsage: argv.printTokenUsage,
    apiKeys: (() => {
      const apiKeys: ApiKeys = {};
      const keys = argv.apiKey || [];
      for (const key of keys) {
        const [provider, value] = key.split('=');
        if (provider && value) {
          const lowerProvider = provider.toLowerCase();
          apiKeys[lowerProvider] = value;
        } else {
          logger.logError({
            error: `Invalid --api-key format: ${key}. Use <provider>=<key>.`,
          });
        }
      }
    })(),
  };
  const defaultConfig: Partial<Config> = {
    language: 'English',
  };
  // priority: argvConfig > projectConfig > globalConfig > defaultConfig
  const config: Partial<Config> = defu(
    argvConfig,
    defu(projectConfig, defu(globalConfig, defaultConfig)),
  );

  const model = (() => {
    if (config.model) {
      const aliased = MODEL_ALIAS[config.model as keyof typeof MODEL_ALIAS];
      return aliased || config.model;
    }
  })();
  // Small model is the model to use for the small and fast queries
  // It's the same as the main model if not specified
  const smallModel =
    (() => {
      if (config.smallModel) {
        const aliased =
          MODEL_ALIAS[config.smallModel as keyof typeof MODEL_ALIAS];
        return aliased || config.smallModel;
      }
    })() || model;
  const stream = (() => {
    if (config.stream !== undefined) {
      return config.stream;
    }
    if (
      model === 'Google/gemini-2.0-pro-exp-02-05' ||
      model === 'Google/gemini-2.5-pro-exp-03-25'
    ) {
      return false;
    }
    return true;
  })();
  const systemPrompt = (() => {
    if (process.env.CODE === 'none') {
      return [];
    }
    return getSystemPrompt({ tasks: config.tasks, cwd });
  })().concat([`return one tool at most each time.`]);
  return {
    model: model as ModelType,
    smallModel: smallModel as ModelType,
    stream,
    tasks: !!config.tasks,
    mcpConfig: config.mcpConfig,
    systemPrompt,
    plugins: normalizePlugins(cwd, config.plugins || []),
    productName,
    language: config.language!,
    apiKeys: config.apiKeys!,
    approvalMode: getApprovalMode(config.approvalMode as ApprovalMode),
    printTokenUsage: !!config.printTokenUsage,
    quiet: !!config.quiet,
  };
}

export function normalizePlugins(cwd: string, plugins: (string | Plugin)[]) {
  return plugins.map((plugin) => {
    if (typeof plugin === 'string') {
      const pluginPath = resolve.sync(plugin, { basedir: cwd });
      const pluginObject = require(pluginPath);
      return pluginObject.default || pluginObject;
    }
    return plugin;
  });
}

export function stringToMcpServerConfigs(mcpValues: string) {
  const configs: Record<string, any> = {};
  const values = mcpValues.split(',');
  let i = 0;
  for (const value of values) {
    const config = stringToMcpServerConfig(value);
    const name = `${config.name}-${i}`;
    configs[name] = config;
    i++;
  }
  return configs;
}

function stringToMcpServerConfig(mcpValue: string) {
  const isSSE =
    typeof mcpValue === 'string' && mcpValue.toLowerCase().startsWith('http');
  if (isSSE) {
    return {
      name: 'sse-server',
      type: 'sse',
      url: mcpValue,
    };
  } else {
    const parts = mcpValue.split(' ');
    const command = parts[0];
    let name = 'command-server';
    const X_COMMANDS = ['npx', 'pnpx', 'tnpx', 'bunx', 'uvx'];
    if (X_COMMANDS.includes(parts[0])) {
      if (parts[1]) {
        name = parts[1] === '-y' && parts[2] ? parts[2] : parts[1];
      }
    } else if (parts[0] === 'env' && X_COMMANDS.includes(parts[2])) {
      if (parts[3]) {
        name = parts[3] === '-y' && parts[4] ? parts[4] : parts[3];
      }
    }
    return {
      name,
      command,
      args: parts.slice(1),
    };
  }
}
