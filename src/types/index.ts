import type yargsParser from 'yargs-parser';
import { Config } from '../config';
import * as logger from '../logger';
import { MCPClient } from '../mcp';
import { PluginManager } from '../plugin/pluginManager';
import type { Plugin } from '../plugin/types';

export interface PluginContext {
  config: Config;
  cwd: string;
  command: string;
  logger: typeof logger;
}

export interface Context {
  argv: yargsParser.Arguments;
  command: string;
  cwd: string;
  config: Config;
  pluginManager: PluginManager<Plugin>;
  pluginContext: PluginContext;
  mcpClients: Record<string, MCPClient>;
}
