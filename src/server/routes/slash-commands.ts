import { Type } from '@sinclair/typebox';
import { FastifyPluginAsync } from 'fastify';
import { CreateServerOpts } from '../types';

const SlashCommandsQuerySchema = Type.Object({
  search: Type.Optional(Type.String()),
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
      },
    },
    async (request, reply) => {
      try {
        const { search } = request.query;

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
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );
};

export default slashCommandsRoute;
