import assert from 'assert';
import yargsParser from 'yargs-parser';
import {
  ConfigManager,
  type McpHttpServerConfig,
  type McpSSEServerConfig,
  type McpStdioServerConfig,
} from '../config';
import type { Context } from '../context';

function printHelp(p: string) {
  console.log(
    `
Usage:
  ${p} mcp [options] [command]

Manage MCP servers. (e.g. ${p} mcp add my-server npx @example/mcp-server)

Options:
  -h, --help                            Show help
  -g, --global                          Use global config instead of project config
  -e, --env <json>                      Environment variables as JSON string
  --sse                                 Use SSE transport for URL-based servers

Commands:
  get [options] <name>                  Get an MCP server configuration
  add [options] <name> <command> [args...] Add an MCP server
  remove|rm [options] <name>            Remove an MCP server
  list|ls [options]                     List all MCP servers
  enable [options] <name>               Enable an MCP server
  disable [options] <name>              Disable an MCP server
  help                                  Show help

Examples:
  ${p} mcp get my-server              Get configuration for my-server
  ${p} mcp add my-server npx @example/mcp-server  Add stdio MCP server
  ${p} mcp add -g my-server npx @example/mcp-server  Add stdio MCP server globally
  ${p} mcp add my-http http://localhost:3000  Add HTTP MCP server
  ${p} mcp add --sse my-sse http://localhost:3000  Add SSE MCP server
  ${p} mcp add -e '{"API_KEY":"123"}' my-server npx @example/mcp-server  Add server with env vars
  ${p} mcp list                       Show all project MCP servers
  ${p} mcp ls -g                      Show all global MCP servers
  ${p} mcp rm my-server               Remove my-server from project config
  ${p} mcp rm -g my-server            Remove my-server from global config
  ${p} mcp enable my-server           Enable my-server in project config
  ${p} mcp disable -g my-server       Disable my-server in global config
      `.trim(),
  );
}

export async function runMCP(context: Context) {
  const productName = context.productName;
  const argv = yargsParser(process.argv.slice(3), {
    alias: {
      help: 'h',
      global: 'g',
      env: 'e',
    },
    boolean: ['help', 'global', 'sse'],
    array: ['env', 'header'],
    string: ['transport'],
  });
  const command = argv._[0];

  // help
  if (!command || argv.help) {
    printHelp(productName.toLowerCase());
    return;
  }

  const cwd = process.cwd();
  const configManager = new ConfigManager(cwd, productName, {});
  const configPath = argv.global
    ? configManager.globalConfigPath
    : configManager.projectConfigPath;

  // get
  if (command === 'get') {
    const key = argv._[1];
    if (!key) {
      console.error('Missing key');
      return;
    }
    const mcpServers =
      (argv.global
        ? configManager.globalConfig.mcpServers
        : configManager.projectConfig.mcpServers) || {};
    const server = mcpServers[key as keyof typeof mcpServers];
    if (!server) {
      console.error(`Error: MCP server ${key} not found`);
      return;
    }
    console.log(JSON.stringify(server, null, 2));
  }

  // add
  if (command === 'add') {
    const key = argv._[1] as string | undefined;
    const value = argv._[2] as string | undefined;
    if (!key || !value) {
      console.error('Missing key or value');
      return;
    }
    const transport = (argv.transport as string) || 'stdio';
    assert(
      transport === 'stdio' || transport === 'sse' || transport === 'http',
      'Invalid transport, must be stdio, sse, or http',
    );
    const mcpServers =
      (argv.global
        ? configManager.globalConfig.mcpServers
        : configManager.projectConfig.mcpServers) || {};
    const isHttpOrSse = transport === 'sse' || transport === 'http';
    if (isHttpOrSse) {
      const isUrl =
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('//');
      assert(isUrl, 'Value must be a URL for http or sse transport');
      const headers = (() => {
        if (argv.header) {
          return (argv.header as string[]).reduce<Record<string, string>>(
            (acc, header) => {
              const [key, value] = header.split(':');
              acc[key.trim()] = value.trim();
              return acc;
            },
            {},
          );
        }
      })();
      mcpServers[key] = {
        url: value,
        type: transport,
      } as McpSSEServerConfig | McpHttpServerConfig;
      if (headers) {
        mcpServers[key].headers = headers;
      }
    } else {
      const [command, ...args] = argv._.slice(2) as string[];
      const env = (() => {
        if (argv.env) {
          return (argv.env as string[]).reduce<Record<string, string>>(
            (acc, env) => {
              const [key, value] = env.split('=');
              acc[key] = value;
              return acc;
            },
            {},
          );
        }
      })();
      mcpServers[key] = {
        type: 'stdio',
        command,
        args,
      } as McpStdioServerConfig;
      if (env) {
        mcpServers[key].env = env;
      }
    }
    configManager.setConfig(
      argv.global,
      'mcpServers',
      JSON.stringify(mcpServers),
    );
    console.log(`Added ${key} to ${configPath}`);
  }

  // remove
  if (command === 'remove' || command === 'rm') {
    const key = argv._[1] as string;
    if (!key) {
      console.error('Missing key');
      return;
    }
    const mcpServers =
      (argv.global
        ? configManager.globalConfig.mcpServers
        : configManager.projectConfig.mcpServers) || {};
    delete mcpServers[key];
    configManager.setConfig(
      argv.global,
      'mcpServers',
      JSON.stringify(mcpServers),
    );
    console.log(`Removed ${key} from ${configPath}`);
  }

  // list
  if (command === 'list' || command === 'ls') {
    const mcpServers =
      (argv.global
        ? configManager.globalConfig.mcpServers
        : configManager.projectConfig.mcpServers) || {};
    console.log(JSON.stringify(mcpServers, null, 2));
  }

  // enable
  if (command === 'enable') {
    const key = argv._[1] as string;
    if (!key) {
      console.error('Missing server name');
      return;
    }
    const mcpServers =
      (argv.global
        ? configManager.globalConfig.mcpServers
        : configManager.projectConfig.mcpServers) || {};
    const server = mcpServers[key];
    if (!server) {
      console.error(`Error: MCP server ${key} not found`);
      return;
    }
    delete server.disable;
    configManager.setConfig(
      argv.global,
      'mcpServers',
      JSON.stringify(mcpServers),
    );
    console.log(`Enabled ${key} in ${configPath}`);
  }

  // disable
  if (command === 'disable') {
    const key = argv._[1] as string;
    if (!key) {
      console.error('Missing server name');
      return;
    }
    const mcpServers =
      (argv.global
        ? configManager.globalConfig.mcpServers
        : configManager.projectConfig.mcpServers) || {};
    const server = mcpServers[key];
    if (!server) {
      console.error(`Error: MCP server ${key} not found`);
      return;
    }
    server.disable = true;
    configManager.setConfig(
      argv.global,
      'mcpServers',
      JSON.stringify(mcpServers),
    );
    console.log(`Disabled ${key} in ${configPath}`);
  }
}
