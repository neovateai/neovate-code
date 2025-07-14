import { FastifyPluginAsync } from 'fastify';
import { CreateServerOpts } from '../types';

const slashCommandsRoute: FastifyPluginAsync<CreateServerOpts> = async (
  app,
  opts,
) => {
  // 获取所有slash commands
  app.get('/slash-commands', async (request, reply) => {
    try {
      const commands = opts.context.slashCommands.getAll();

      // 按类型分类命令
      const categorizedCommands = {
        builtin: commands.filter(
          (cmd) =>
            !cmd.name.includes(':') &&
            ['clear', 'exit', 'help', 'init', 'compact'].includes(cmd.name) &&
            cmd.type !== 'local-jsx',
        ),
        user: commands.filter((cmd) => cmd.name.startsWith('user:')),
        project: commands.filter((cmd) => cmd.name.startsWith('project:')),
        plugin: commands.filter(
          (cmd) =>
            !cmd.name.includes(':') &&
            !['clear', 'exit', 'help', 'init', 'compact'].includes(cmd.name) &&
            cmd.type !== 'local-jsx',
        ),
      };

      const filteredCommands = commands.filter(
        (cmd) => cmd.type !== 'local-jsx',
      );

      return {
        success: true,
        data: {
          total: filteredCommands.length,
          commands: filteredCommands,
          categorized: categorizedCommands,
        },
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

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
  app.get('/slash-commands/search/:prefix', async (request, reply) => {
    try {
      const { prefix } = request.params as { prefix: string };
      const matchingCommands =
        opts.context.slashCommands.getMatchingCommands(prefix);

      return {
        success: true,
        data: {
          prefix,
          matches: matchingCommands,
          count: matchingCommands.length,
        },
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};

export default slashCommandsRoute;
