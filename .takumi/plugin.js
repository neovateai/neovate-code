
export default {
  commands: async () => {
    return {
      name: 'foo',
      description: 'foo',
      fn: async () => {
        console.log('foo');
      },
    };
  },
  cliStart: async () => {
  },
};
