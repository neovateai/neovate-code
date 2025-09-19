import { FastMCP } from 'fastmcp';

const server = new FastMCP({
  name: 'e2e-mcp-stdio-server',
  version: '0.1.0',
});

server.addTool({
  name: 'echo',
  description: 'Echoes the input',
  input: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
      },
    },
  },
  run: async ({ message }) => {
    return {
      message,
    };
  },
});

server.addTool({
  name: 'sum',
  description: 'Sums two numbers',
  input: {
    type: 'object',
    properties: {
      a: {
        type: 'number',
      },
      b: {
        type: 'number',
      },
    },
    required: ['a', 'b'],
  },
  run: async ({ a, b }) => {
    return {
      result: a + b,
    };
  },
});

server.start({
  transportType: 'stdio',
});
