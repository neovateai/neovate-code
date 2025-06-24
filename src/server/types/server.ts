import { ModelProvider } from '@openai/agents';
import { Context } from '../../context';
import { ServerAppData } from './app-data';

export interface RunBrowserServerOpts {
  prompt: string;
  cwd?: string;
  modelProvider?: ModelProvider;
  plan?: boolean;
  context: Context;
  logLevel?: string;
  port?: number;
}

export interface CreateServerOpts extends RunBrowserServerOpts {
  traceName: string;
  appData: ServerAppData;
}
