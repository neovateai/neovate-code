import { Type } from '@sinclair/typebox';
import { FastifyPluginAsync } from 'fastify';
import { CreateServerOpts } from '../types';

const SlashCommandsQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  pageSize: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  search: Type.Optional(Type.String()),
});

const SlashCommandsSearchQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  pageSize: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
});

const slashCommandsRoute: FastifyPluginAsync<CreateServerOpts> = async (
  app,
  opts,
) => {
  // 获取所有slash commands
  app.get<{
    Querystring: { page?: number; pageSize?: number; search?: string };
  }>(
    '/slash-commands',
    {
      schema: {
        querystring: SlashCommandsQuerySchema,
      },
    },
    async (request, reply) => {
      try {
        const { page = 1, pageSize = 50, search } = request.query;

        let commands = opts.context.slashCommands.getAll();

        // 过滤掉 local-jsx 类型的命令
        commands = commands.filter((cmd) => cmd.type !== 'local-jsx');

        // 搜索过滤
        if (search && search.trim()) {
          const searchTerm = search.toLowerCase().trim();
          commands = commands.filter(
            (cmd) =>
              cmd.name.toLowerCase().includes(searchTerm) ||
              cmd.description?.toLowerCase().includes(searchTerm),
          );
        }

        // 按类型分类命令
        const categorizedCommands = {
          builtin: commands.filter(
            (cmd) =>
              !cmd.name.includes(':') &&
              ['clear', 'exit', 'help', 'init', 'compact'].includes(cmd.name),
          ),
          user: commands.filter((cmd) => cmd.name.startsWith('user:')),
          project: commands.filter((cmd) => cmd.name.startsWith('project:')),
          plugin: commands.filter(
            (cmd) =>
              !cmd.name.includes(':') &&
              !['clear', 'exit', 'help', 'init', 'compact'].includes(cmd.name),
          ),
        };

        // 分页处理
        const total = commands.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedCommands = commands.slice(startIndex, endIndex);

        return {
          success: true,
          data: {
            total,
            page,
            pageSize,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            commands: paginatedCommands,
            categorized: categorizedCommands,
          },
        };
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  // 获取特定的slash command
  app.get('/slash-commands/:name', async (request, reply) => {
    try {
      const { name } = request.params as { name: string };
      const command = opts.context.slashCommands.get(name);

      if (!command) {
        return reply.status(404).send({
          success: false,
          error: `Command '${name}' not found`,
        });
      }

      return {
        success: true,
        data: command,
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // 搜索slash commands
  app.get<{
    Params: { prefix: string };
    Querystring: { page?: number; pageSize?: number };
  }>(
    '/slash-commands/search/:prefix',
    {
      schema: {
        querystring: SlashCommandsSearchQuerySchema,
      },
    },
    async (request, reply) => {
      try {
        const { prefix } = request.params;
        const { page = 1, pageSize = 50 } = request.query;

        const matchingCommands =
          opts.context.slashCommands.getMatchingCommands(prefix);

        // 分页处理
        const total = matchingCommands.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedMatches = matchingCommands.slice(startIndex, endIndex);

        return {
          success: true,
          data: {
            prefix,
            total,
            page,
            pageSize,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            matches: paginatedMatches,
            count: paginatedMatches.length,
          },
        };
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );
};

export default slashCommandsRoute;
