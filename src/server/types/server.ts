// @ts-nocheck
import { type ModelProvider } from '@openai/agents';
import { Context } from '../../context';
import { Service } from '../../service';
import { type ServerAppData } from './app-data';

export interface RunBrowserServerOpts {
  prompt: string;
  cwd?: string;
  modelProvider?: ModelProvider;
  context: Context;
  logLevel?: string;
  port?: number;
}

export interface CreateServerOpts extends RunBrowserServerOpts {
  appData: ServerAppData;
}

export interface RouteCompletionsOpts extends CreateServerOpts {
  service: Service;
  planService: Service;
}
