import { type Plugin, runNeovate } from '../../src/index';

const myPlugin: Plugin = {
  config({ config, argvConfig }) {
    return {
      model: argvConfig.model || config.model || 'cc/claude-opus-4-5',
      smallModel:
        argvConfig.smallModel ||
        config.smallModel ||
        argvConfig.model ||
        'cc/claude-haiku-4-5',
    };
  },
  provider(memo, opts) {
    return {
      cc: {
        id: 'cc',
        env: [],
        name: 'cc',
        doc: 'https://sorrycc.com',
        models: {
          'claude-opus-4-5': opts.models['claude-opus-4-5'],
          'claude-haiku-4-5': opts.models['claude-haiku-4-5'],
        },
        createModel(name, _provider) {
          return opts
            .createAnthropic({
              apiKey: '',
              baseURL: '',
            })
            .chat(name);
        },
      },
      ...memo,
    };
  },
};

runNeovate({
  productName: 'MyCodeAgent',
  version: '0.1.0',
  plugins: [myPlugin],
}).catch(console.error);
