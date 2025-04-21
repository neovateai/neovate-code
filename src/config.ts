import { Tool } from 'ai';
import fs from 'fs';
import path from 'path';
import yargsParser from 'yargs-parser';
import { PRODUCT_NAME } from './constants/product';
import { getSystemPrompt } from './constants/prompts';
import { getContext } from './context';
import { logInfo } from './logger';
import { ModelType } from './model';
import type { Plugin } from './plugin/types';
import { getTools } from './tools';

function getCwd() {
  return process.cwd();
}

export type Config = {
  model: ModelType;
  smallModel: ModelType;
  stream: boolean;
  mcpConfig: any;
  builtinTools: Record<string, Tool>;
  context: Record<string, any>;
  systemPrompt: string[];
  tasks: boolean;
  plugins: Plugin[];
};

export async function getConfig(opts: {
  argv: yargsParser.Arguments;
}): Promise<Config> {
  const { argv } = opts;

  const model = argv.model;
  if (!model) {
    throw new Error('Model is required');
  }

  // Small model is the model to use for the small and fast queries
  // It's the same as the main model if not specified
  const smallModel = argv.smallModel || model;

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
    getCwd(),
    `.${PRODUCT_NAME.toLowerCase()}/mcp.json`,
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
      logInfo(
        `Using MCP config from ${path.relative(getCwd(), mcpConfigPath)}`,
      );
      return JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
    } else {
      logInfo(
        `No MCP config found at ${path.relative(getCwd(), mcpConfigPath)}`,
      );
      return {};
    }
  })();

  // Check if tasks feature is enabled
  const tasks = !!argv.tasks;

  const builtinTools = await getTools({ tasks });
  let context = await getContext({
    codebase: argv.codebase,
  });
  let systemPrompt = getSystemPrompt({ tasks });
  if (process.env.CODE === 'none') {
    systemPrompt = [];
    context = {};
  }
  systemPrompt.push(`return one tool at most each time.`);
  return {
    model,
    smallModel,
    stream,
    mcpConfig,
    builtinTools,
    context,
    systemPrompt,
    tasks,
    plugins: [],
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
