import { FastMCP } from 'fastmcp';
import { createRequire } from 'module';
import path from 'path';
import yargsParser from 'yargs-parser';
import { registerTools } from './mcp-server';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const SERVER_NAME = 'Takumi MCP Server';
const args = yargsParser(process.argv.slice(2));
const root = (() => {
  if (!args._[0]) {
    console.error('Please provide a root directory');
    process.exit(1);
  }
  return path.resolve(process.cwd(), args._[0] as string);
})();
const server = new FastMCP({ name: SERVER_NAME, version: pkg.version });

registerTools({ server, root });
server.start({ transportType: 'stdio' });
