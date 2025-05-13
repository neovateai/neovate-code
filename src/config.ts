import fs from 'fs';
import path from 'path';
import yargsParser from 'yargs-parser';
import { AUTO_SELECT_MODELS, MODEL_ALIAS, ModelType } from './llms/model';
import type { Plugin } from './pluginManager/types';
import { getSystemPrompt } from './prompts/prompts';
import { type ApprovalModel, getApprovalModel } from './utils/approvalMode';
import * as logger from './utils/logger';

export type ApiKeys = Record<string, string>;

export type Config = {
  model: ModelType;
  smallModel: ModelType;
  stream: boolean;
  mcpConfig: any;
  systemPrompt: string[];
  tasks: boolean;
  plugins: Plugin[];
  pluginPaths?: string[];
  productName: string;
  language: string;
  apiKeys: ApiKeys;
  customSystemPrompt: string[];
  approvalModel: ApprovalModel;
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
      return JSON.parse(configContent);
    } catch (error: any) {
      logger.logWarn(
        `Unable to read config file ${filePath}: ${error.message}`,
      );
    }
  }
  return {};
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

  const combinedConfig = { ...globalConfig, ...projectConfig };

  const model = (() => {
    if (argv.model) {
      const alias = MODEL_ALIAS[argv.model as keyof typeof MODEL_ALIAS];
      logger.logDebug(
        `Using model from --model argument: ${alias || argv.model}`,
      );
      return alias || argv.model;
    }

    if (combinedConfig.model) {
      logger.logDebug(`Using model from config file: ${combinedConfig.model}`);
      return combinedConfig.model;
    }

    for (const [apiKeyEnvName, modelName] of AUTO_SELECT_MODELS) {
      if (process.env[apiKeyEnvName]) {
        logger.logWarn(
          `Using model '${modelName}' as model is not specified but '${apiKeyEnvName}' is set.`,
        );
        return modelName as ModelType;
      }
    }
  })();

  // Small model is the model to use for the small and fast queries
  // It's the same as the main model if not specified
  const smallModel =
    (() => {
      if (argv.smallModel) {
        const alias = MODEL_ALIAS[argv.smallModel as keyof typeof MODEL_ALIAS];
        return alias || argv.smallModel;
      }

      if (combinedConfig.smallModel) {
        return combinedConfig.smallModel;
      }

      return undefined;
    })() || model;

  const stream = (() => {
    if (argv.stream !== undefined) {
      return argv.stream !== 'false';
    }

    if (combinedConfig.stream !== undefined) {
      return combinedConfig.stream;
    }

    if (
      model === 'Google/gemini-2.0-pro-exp-02-05' ||
      model === 'Google/gemini-2.5-pro-exp-03-25'
    ) {
      return false;
    }

    return true;
  })();

  const apiKeys: ApiKeys = { ...(combinedConfig.apiKeys || {}) };
  if (argv.apiKey) {
    const keys = Array.isArray(argv.apiKey) ? argv.apiKey : [argv.apiKey];
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
  }

  const mcpConfigPath = path.join(
    cwd,
    `.${productName.toLowerCase()}/mcp.json`,
  );
  const mcpConfig = (() => {
    if (argv.mcp) {
      const mcpValues = argv.mcp;
      const mcpServers = stringToMcpServerConfigs(mcpValues);
      logger.logDebug(`Using MCP servers from command line: ${mcpValues}`);
      return {
        mcpServers,
      };
    }

    if (combinedConfig.mcpConfig) {
      return combinedConfig.mcpConfig;
    }

    if (fs.existsSync(mcpConfigPath)) {
      return JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
    } else {
      return {};
    }
  })();

  const tasks = (() => {
    if (argv.tasks !== undefined) {
      return !!argv.tasks;
    }

    if (combinedConfig.tasks !== undefined) {
      return combinedConfig.tasks;
    }

    return false;
  })();

  const language = (() => {
    if (argv.language) {
      return argv.language;
    }

    if (combinedConfig.language) {
      return combinedConfig.language;
    }

    return 'English';
  })();

  let systemPrompt = getSystemPrompt({ tasks, cwd });

  if (process.env.CODE === 'none') {
    systemPrompt = [];
  }

  systemPrompt.push(`return one tool at most each time.`);

  if (
    combinedConfig.customSystemPrompt &&
    combinedConfig.customSystemPrompt.length > 0
  ) {
    systemPrompt = systemPrompt.concat([
      '# User Custom Instructions',
      ...combinedConfig.customSystemPrompt,
    ]);
  }

  return {
    model,
    smallModel,
    stream,
    tasks,
    mcpConfig,
    systemPrompt,
    plugins: combinedConfig.plugins || [],
    productName,
    language,
    apiKeys,
    customSystemPrompt: combinedConfig.customSystemPrompt || [],
    pluginPaths: combinedConfig.pluginPaths || [],
    approvalModel: getApprovalModel(argv.approvalMode as ApprovalModel),
  };
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
