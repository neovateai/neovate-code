import { Type } from '@sinclair/typebox';
import { FastifyPluginAsync } from 'fastify';
import { ConfigManager } from '../../config';

const mcpRoute: FastifyPluginAsync = async (app) => {
  // Reuse existing ConfigManager logic
  const createConfigManager = (cwd: string = process.cwd()) => {
    return new ConfigManager(cwd, 'takumi', {});
  };

  // Get MCP server list (corresponds to CLI: takumi mcp list)
  app.get(
    '/mcp/servers',
    {
      schema: {
        querystring: Type.Object({
          global: Type.Optional(Type.Boolean()),
        }),
      },
    },
    async (request) => {
      const { global = false } = request.query as { global?: boolean };
      const configManager = createConfigManager();

      // Directly reuse logic from CLI
      const mcpServers = global
        ? configManager.globalConfig.mcpServers || {}
        : configManager.projectConfig.mcpServers || {};

      return {
        success: true,
        servers: mcpServers,
        scope: global ? 'global' : 'project',
      };
    },
  );

  // Get single MCP server (corresponds to CLI: takumi mcp get <name>)
  app.get(
    '/mcp/servers/:name',
    {
      schema: {
        params: Type.Object({
          name: Type.String(),
        }),
        querystring: Type.Object({
          global: Type.Optional(Type.Boolean()),
        }),
      },
    },
    async (request, reply) => {
      const { name } = request.params as { name: string };
      const { global = false } = request.query as { global?: boolean };
      const configManager = createConfigManager();

      //  Reuse CLI get logic
      const mcpServers = global
        ? configManager.globalConfig.mcpServers || {}
        : configManager.projectConfig.mcpServers || {};

      const server = mcpServers[name as keyof typeof mcpServers];
      if (!server) {
        return reply.code(404).send({
          error: `MCP server ${name} not found`,
        });
      }

      return { success: true, server, name };
    },
  );

  // Add/update MCP server (corresponds to CLI: takumi mcp add)
  app.post(
    '/mcp/servers',
    {
      schema: {
        body: Type.Object({
          name: Type.String(),
          command: Type.Optional(Type.String()),
          args: Type.Optional(Type.Array(Type.String())),
          url: Type.Optional(Type.String()),
          transport: Type.Optional(Type.String()),
          env: Type.Optional(Type.String()), // JSON string
          global: Type.Optional(Type.Boolean()),
        }),
      },
    },
    async (request) => {
      const {
        name,
        command,
        args = [],
        url,
        transport = 'stdio',
        env,
        global = false,
      } = request.body as {
        name: string;
        command?: string;
        args?: string[];
        url?: string;
        transport?: string;
        env?: string;
        global?: boolean;
      };

      const configManager = createConfigManager();

      // Reuse CLI add logic
      const mcpServers = global
        ? configManager.globalConfig.mcpServers || {}
        : configManager.projectConfig.mcpServers || {};

      if (url) {
        mcpServers[name] = {
          url,
        };
      } else {
        if (!command) {
          throw new Error('Command is required when URL is not provided');
        }
        mcpServers[name] = {
          command,
          args,
          env: env ? JSON.parse(env) : undefined,
        };
      }

      //  Directly use existing save logic
      configManager.setConfig(global, 'mcpServers', JSON.stringify(mcpServers));

      const configPath = global
        ? configManager.globalConfigPath
        : configManager.projectConfigPath;

      return {
        success: true,
        message: `Added ${name} to ${configPath}`,
        server: mcpServers[name],
      };
    },
  );

  // Update MCP server
  app.patch(
    '/mcp/servers/:name',
    {
      schema: {
        params: Type.Object({
          name: Type.String(),
        }),
        body: Type.Object({
          command: Type.Optional(Type.String()),
          args: Type.Optional(Type.Array(Type.String())),
          url: Type.Optional(Type.String()),
          transport: Type.Optional(Type.String()),
          env: Type.Optional(Type.String()), // JSON string
          global: Type.Optional(Type.Boolean()),
        }),
      },
    },
    async (request) => {
      const { name } = request.params as { name: string };
      const {
        command,
        args,
        url,
        transport,
        env,
        global = false,
      } = request.body as {
        command?: string;
        args?: string[];
        url?: string;
        transport?: string;
        env?: string;
        global?: boolean;
      };

      const configManager = createConfigManager();

      // Get existing servers
      const mcpServers = global
        ? configManager.globalConfig.mcpServers || {}
        : configManager.projectConfig.mcpServers || {};

      if (!mcpServers[name]) {
        throw new Error(`MCP server ${name} not found`);
      }

      // Update existing server config
      const existingServer = mcpServers[name];

      let newConfig;
      if (url) {
        // If url is provided, it's a URL-based server.
        // It should discard command/args.
        newConfig = {
          url: url,
          env: env ? JSON.parse(env) : existingServer.env,
        };
      } else if (command) {
        // If command is provided, it's a command-based server.
        // It should discard url.
        newConfig = {
          command: command,
          args: args || existingServer.args,
          env: env ? JSON.parse(env) : existingServer.env,
        };
      } else {
        // If neither is provided, just update non-type fields like args and env.
        newConfig = { ...existingServer };
        if (args) newConfig.args = args;
        if (env) newConfig.env = JSON.parse(env);
      }

      mcpServers[name] = newConfig;

      configManager.setConfig(global, 'mcpServers', JSON.stringify(mcpServers));

      const configPath = global
        ? configManager.globalConfigPath
        : configManager.projectConfigPath;

      return {
        success: true,
        message: `Updated ${name} in ${configPath}`,
        server: mcpServers[name],
      };
    },
  );

  // Remove MCP server (corresponds to CLI: takumi mcp rm)
  app.delete(
    '/mcp/servers/:name',
    {
      schema: {
        params: Type.Object({
          name: Type.String(),
        }),
        querystring: Type.Object({
          global: Type.Optional(Type.Boolean()),
        }),
      },
    },
    async (request) => {
      const { name } = request.params as { name: string };
      const { global = false } = request.query as { global?: boolean };
      const configManager = createConfigManager();

      // Reuse CLI remove logic
      const mcpServers = global
        ? { ...(configManager.globalConfig.mcpServers || {}) }
        : { ...(configManager.projectConfig.mcpServers || {}) };

      if (!mcpServers[name]) {
        throw new Error(`MCP server ${name} not found`);
      }

      delete mcpServers[name];

      // Update the config and also update the in-memory config
      configManager.setConfig(global, 'mcpServers', JSON.stringify(mcpServers));

      // Ensure the in-memory config is updated
      if (global) {
        configManager.globalConfig.mcpServers = mcpServers;
      } else {
        configManager.projectConfig.mcpServers = mcpServers;
      }

      const configPath = global
        ? configManager.globalConfigPath
        : configManager.projectConfigPath;

      return {
        success: true,
        message: `Removed ${name} from ${configPath}`,
      };
    },
  );
};

export default mcpRoute;
