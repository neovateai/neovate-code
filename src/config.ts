import { Tool } from 'ai';
import fs from 'fs';
import path from 'path';
import yargsParser from 'yargs-parser';
import { PRODUCT_NAME } from './constants/product';
import { getContext } from './context';
import { logInfo } from './logger';
import { ModelType } from './model';
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
};

export async function getConfig(opts: {
  argv: yargsParser.Arguments;
}): Promise<Config> {
  const { argv } = opts;

  const model = argv.model || 'OpenAI/gpt-3.5-turbo-0613';
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
      return false;
    }
    return argv.stream !== 'false';
  })();

  const mcpConfigPath = path.join(
    getCwd(),
    `.${PRODUCT_NAME.toLowerCase()}/mcp.json`,
  );
  const mcpConfig = (() => {
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

  const builtinTools = await getTools();
  const context = await getContext({
    codebase: argv.codebase,
  });
  return {
    model,
    smallModel,
    stream,
    mcpConfig,
    builtinTools,
    context,
  };
}

export function printConfig(config: Config) {
  logInfo(`Using model: ${config.model}`);
  logInfo(`Using small model: ${config.smallModel}`);
  logInfo(`Using stream: ${config.stream}`);
  logInfo(
    `Using MCP servers: ${Object.keys(config.mcpConfig.mcpServers || {}).join(', ')}`,
  );
}
