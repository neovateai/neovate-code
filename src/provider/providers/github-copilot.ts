import { createOpenAI } from '@ai-sdk/openai';
import assert from 'assert';
import { GithubProvider } from 'oauth-providers';
import type { Provider } from './types';

export const githubCopilotProvider: Provider = {
  id: 'github-copilot',
  name: 'GitHub Copilot',
  source: 'built-in',
  env: [],
  apiEnv: [],
  api: 'https://api.githubcopilot.com',
  doc: 'https://github.com/settings/copilot/features',
  models: {
    'claude-opus-4': {},
    'grok-code-fast-1': {},
    'claude-3.5-sonnet': {},
    'o3-mini': {},
    'gpt-5-codex': {},
    'gpt-4o': {},
    'gpt-4.1': {},
    'o4-mini': {},
    'claude-opus-41': {},
    'gpt-5-mini': {},
    'claude-3.7-sonnet': {},
    'gemini-2.5-pro': {},
    'gemini-3-pro-preview': {},
    o3: {},
    'claude-sonnet-4': {},
    'gpt-5.1-codex': {},
    'gpt-5.1-codex-mini': {},
    'gpt-5.1': {},
    'gpt-5': {},
    'claude-3.7-sonnet-thought': {},
    'claude-sonnet-4.5': {},
    'claude-opus-4-5': {},
    'gpt-5.2': {},
  },
  async createModel(name, provider, options) {
    const apiKey = provider.options?.apiKey;
    assert(
      apiKey,
      'Failed to get GitHub Copilot token, use /login to login first',
    );
    let account = JSON.parse(apiKey);
    const githubProvider = new GithubProvider();
    githubProvider.setState(account);
    if (githubProvider.isTokenExpired()) {
      await githubProvider.refresh();
      account = githubProvider.getState();
      provider.options = {
        ...provider.options,
        apiKey: JSON.stringify(account),
      };
      options.setGlobalConfig(
        'provider.github-copilot.options.apiKey',
        JSON.stringify(account),
        true,
      );
    }
    const token = account.copilot_token;
    return createOpenAI({
      baseURL: 'https://api.individual.githubcopilot.com',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'GitHubCopilotChat/0.26.7',
        'Editor-Version': 'vscode/1.99.3',
        'Editor-Plugin-Version': 'copilot-chat/0.26.7',
        'Copilot-Integration-Id': 'vscode-chat',
      },
      // fix Failed: OpenAI API key is missing
      apiKey: '',
    }).chat(name);
  },
};
