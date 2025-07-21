import { Type } from '@sinclair/typebox';
import { FastifyPluginAsync } from 'fastify';
import { CreateServerOpts } from '../types';

const SlashCommandsQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ maxLength: 100 })),
});

const SlashCommandsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Optional(
    Type.Object({
      total: Type.Number(),
      commands: Type.Array(
        Type.Object({
          name: Type.String(),
          description: Type.Optional(Type.String()),
          type: Type.String(),
        }),
      ),
      categorized: Type.Object({
        builtin: Type.Array(Type.Any()),
        user: Type.Array(Type.Any()),
        project: Type.Array(Type.Any()),
        plugin: Type.Array(Type.Any()),
      }),
    }),
  ),
  error: Type.Optional(Type.String()),
});

const slashCommandsRoute: FastifyPluginAsync<CreateServerOpts> = async (
  app,
  opts,
) => {
  // 获取所有slash commands
  app.get<{
    Querystring: { search?: string };
  }>(
    '/slash-commands',
    {
      schema: {
        querystring: SlashCommandsQuerySchema,
        response: {
          200: SlashCommandsResponseSchema,
          400: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
          500: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        // 搜索输入清理和校验
        let sanitizedSearch = request.query.search?.trim();
        if (sanitizedSearch && sanitizedSearch.length > 100) {
          sanitizedSearch = sanitizedSearch.slice(0, 100);
        }

        let commands = opts.context.slashCommands.getAll();

        // 过滤掉 local-jsx 类型的命令
        commands = commands.filter((cmd) => cmd.type !== 'local-jsx');

        // 搜索过滤
        if (sanitizedSearch && sanitizedSearch.length > 0) {
          const searchTerm = sanitizedSearch.toLowerCase();
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

        // 限制返回前50条
        const limitedCommands = commands.slice(0, 50);

        return {
          success: true,
          data: {
            total: limitedCommands.length,
            commands: limitedCommands,
            categorized: categorizedCommands,
          },
        };
      } catch (error) {
        // 记录详细错误日志
        console.error('Slash commands API error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    },
  );
};

export default slashCommandsRoute;
