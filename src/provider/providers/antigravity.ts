import type { Provider } from './types';

export const antigravityProvider: Provider = {
  id: 'antigravity',
  source: 'built-in',
  env: [],
  name: 'Antigravity',
  doc: 'https://antigravity.google/',
  models: {
    'gemini-2.5-flash-lite': {},
    'gemini-2.5-flash': {},
    'gemini-2.5-flash-thinking': {},
    'gemini-2.5-pro': {},
    'gemini-3-flash': {},
    'gemini-3-pro-low': {},
    'gemini-3-pro-high': {},
    'claude-sonnet-4-5': {},
    'claude-sonnet-4-5-thinking': {},
    'claude-opus-4-5-thinking': {},
    'gpt-oss-120b-medium': {},
  },
  async createModel(_name, _provider, _options) {
    throw new Error('Antigravity not supported, need fix');
    // const apiKey = provider.options?.apiKey;
    // assert(apiKey, 'Antigravity not logged in.');
    // let account = JSON.parse(apiKey);
    // const p = new AntigravityProvider();
    // p.setState(account);
    // if (p.isTokenExpired()) {
    //   await p.refresh();
    //   account = p.getState();
    //   provider.options = {
    //     ...provider.options,
    //     apiKey: JSON.stringify(account),
    //   };
    //   options.setGlobalConfig(
    //     'provider.antigravity.options.apiKey',
    //     JSON.stringify(account),
    //     true,
    //   );
    // }
    // return createAntigravityProvider({
    //   account,
    // })(name);
  },
};
