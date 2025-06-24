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

      return { server, name };
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

      if (transport === 'sse') {
        if (!url) {
          throw new Error('URL is required for SSE transport');
        }
        mcpServers[name] = {
          type: 'sse',
          url,
        };
      } else {
        if (!command) {
          throw new Error('Command is required for stdio transport');
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
        ? configManager.globalConfig.mcpServers || {}
        : configManager.projectConfig.mcpServers || {};

      if (!mcpServers[name]) {
        throw new Error(`MCP server ${name} not found`);
      }

      delete mcpServers[name];
      configManager.setConfig(global, 'mcpServers', JSON.stringify(mcpServers));

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
