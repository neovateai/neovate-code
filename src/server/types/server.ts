import { ModelProvider } from '@openai/agents';
import { Context } from '../../context';
import { Service } from '../../service';
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
  appData: ServerAppData;
}

export interface RouteCompletionsOpts extends CreateServerOpts {
  service: Service;
}
