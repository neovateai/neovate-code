import type yargsParser from 'yargs-parser';
import { Config } from '../config';
import type { AskQueryOptions, EditQueryOptions } from '../llms/query';
import { MCPClient } from '../mcp';
import { PluginManager } from '../pluginManager/pluginManager';
import type { Plugin } from '../pluginManager/types';
import { EventManager } from '../server/eventManager/eventManager';
import * as logger from '../utils/logger';

type Paths = {
  configDir: string;
  configPath: string;
  sessionPath: string;
};

export interface PluginContext {
  config: Config;
  cwd: string;
  command: string;
  logger: typeof logger;
  argv: yargsParser.Arguments;
  paths: Paths;
  sessionId: string;
  eventManager: EventManager;
  askQuery: (opts: Omit<AskQueryOptions, 'context'>) => Promise<string>;
  editQuery: (opts: Omit<EditQueryOptions, 'context'>) => Promise<string>;
}

export interface Context {
  argv: yargsParser.Arguments;
  command: string;
  cwd: string;
  config: Config;
  pluginManager: PluginManager<Plugin>;
  pluginContext: PluginContext;
  mcpClients: Record<string, MCPClient>;
  paths: Paths;
  sessionId: string;
}
