import fs from 'fs';
import path from 'path';
import yargsParser from 'yargs-parser';
import { MODEL_ALIAS, ModelType } from './llm/model';
import type { Plugin } from './pluginManager/types';
import { getSystemPrompt } from './prompts/prompts';
import { logInfo } from './utils/logger';

export type Config = {
  model: ModelType;
  smallModel: ModelType;
  stream: boolean;
  mcpConfig: any;
  systemPrompt: string[];
  tasks: boolean;
  plugins: Plugin[];
  productName: string;
  language: string;
};

export async function getConfig(opts: {
  argv: yargsParser.Arguments;
  productName: string;
  cwd: string;
}): Promise<Config> {
  const { argv, productName } = opts;

  const model = (() => {
    if (!argv.model) return undefined;
    const alias = MODEL_ALIAS[argv.model as keyof typeof MODEL_ALIAS];
    return alias || argv.model;
  })();

  // Small model is the model to use for the small and fast queries
  // It's the same as the main model if not specified
  const smallModel =
    (() => {
      if (!argv.smallModel) return undefined;
      const alias = MODEL_ALIAS[argv.smallModel as keyof typeof MODEL_ALIAS];
      return alias || argv.smallModel;
    })() || model;

  const stream = (() => {
    if (
      model === 'Google/gemini-2.0-pro-exp-02-05' ||
      model === 'Google/gemini-2.5-pro-exp-03-25'
    ) {
      console.log(
        'Using stream: false since Gemini pro models do not support streaming',
      );
      return false;
    }
    return argv.stream !== 'false';
  })();

  const mcpConfigPath = path.join(
    opts.cwd,
    `.${productName.toLowerCase()}/mcp.json`,
  );
  const mcpConfig = (() => {
    // Check if mcp argument is provided
    if (argv.mcp) {
      const mcpValues = argv.mcp;
      const mcpServers = stringToMcpServerConfigs(mcpValues);
      logInfo(`Using MCP servers from command line: ${mcpValues}`);
      return {
        mcpServers,
      };
    }

    // Fallback to config file if no mcp argument
    if (fs.existsSync(mcpConfigPath)) {
      return JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
    } else {
      return {};
    }
  })();

  // Check if tasks feature is enabled
  const tasks = !!argv.tasks;

  let systemPrompt = getSystemPrompt({ tasks, cwd: opts.cwd });
  if (process.env.CODE === 'none') {
    systemPrompt = [];
  }
  systemPrompt.push(`return one tool at most each time.`);
  return {
    model,
    smallModel,
    stream,
    tasks,
    mcpConfig,
    systemPrompt,
    plugins: [],
    productName,
    language: argv.language || 'English',
  };
}

export function printConfig(config: Config) {
  logInfo(`Using model: ${config.model}`);
  logInfo(`Using small model: ${config.smallModel}`);
  logInfo(`Using stream: ${config.stream}`);
  logInfo(
    `Using MCP servers: ${Object.keys(config.mcpConfig.mcpServers || {}).join(', ')}`,
  );
  logInfo(`Tasks feature: ${config.tasks ? 'enabled' : 'disabled'}`);
}

function stringToMcpServerConfigs(mcpValues: string) {
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
