const RPEFIX = '[.takumi/plugin.js]';

export default {
  config (config) {
    console.log(RPEFIX, 'config', config, this);
    return {
    };
  },
  configResolved ({ resolvedConfig }) {
    console.log(RPEFIX, 'resolvedConfig', resolvedConfig, this);
  },
  cliStart () {
    console.log(RPEFIX, 'cliStart', this);
  },
  cliEnd () {
    console.log(RPEFIX, 'cliEnd', this);
  },
};
