import { ModelProvider } from '@openai/agents';
import { Config } from '../../v2/config';

export interface RunBrowserServerOpts {
  prompt: string;
  cwd?: string;
  argvConfig?: Partial<Config>;
  productName?: string;
  modelProvider?: ModelProvider;
  plan?: boolean;
}

export interface CreateServerOpts extends RunBrowserServerOpts {
  traceName: string;
}
