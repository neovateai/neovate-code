import { ModelProvider } from '@openai/agents';
import { Context } from '../../context';

export interface RunBrowserServerOpts {
  prompt: string;
  cwd?: string;
  modelProvider?: ModelProvider;
  plan?: boolean;
  context: Context;
  logLevel?: string;
}

export interface CreateServerOpts extends RunBrowserServerOpts {
  traceName: string;
}
