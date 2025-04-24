import type yargsParser from 'yargs-parser';
import { Config } from '../config';
import { MCPClient } from '../mcp';
import { PluginManager } from '../pluginManager/pluginManager';
import type { Plugin } from '../pluginManager/types';
import * as logger from '../utils/logger';

export interface PluginContext {
  config: Config;
  cwd: string;
  command: string;
  logger: typeof logger;
  argv: yargsParser.Arguments;
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
