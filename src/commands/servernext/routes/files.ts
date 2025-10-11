import { Type } from '@sinclair/typebox';
import createDebug from 'debug';
import type { FastifyPluginAsync } from 'fastify';
import * as fs from 'fs/promises';
import path from 'pathe';
import type { ContextCreateOpts } from '../../../context';

const debug = createDebug('neovate:server:files');

const FileEditRequestSchema = Type.Object({
  filePath: Type.String(),
  content: Type.String(),
});

const FileReadRequestSchema = Type.Object({
  filePath: Type.String(),
});

interface FileEditRequest {
  filePath: string;
  content: string;
}

const filesRoute: FastifyPluginAsync<ContextCreateOpts> = async (app, opts) => {
  app.get<{ Querystring: { filePath: string } }>(
    '/files/read',
    {
      schema: {
        querystring: FileReadRequestSchema,
      },
    },
    async (request, reply) => {
      try {
        const { filePath } = request.query;
        const cwd = opts.cwd;
        const absolutePath = path.resolve(cwd, filePath);

        if (!absolutePath.startsWith(cwd)) {
          return reply.code(400).send({
            success: false,
            error: 'File path is outside of the project directory.',
          });
        }

        const content = await fs.readFile(absolutePath, 'utf-8');

        return reply.send({
          success: true,
          data: {
            content,
            filePath,
          },
        });
      } catch (error) {
        debug(`File read API error:`, error);
        if (error instanceof Error && error.message === 'ENOENT') {
          return reply.code(404).send({
            success: false,
            message: 'File not found.',
          });
        }
        return reply.code(500).send({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while reading file.',
        });
      }
    },
  );

  app.post<{ Body: FileEditRequest }>(
    '/files/edit',
    {
      schema: {
        body: FileEditRequestSchema,
      },
    },
    async (request, reply) => {
      try {
        const { filePath, content } = request.body;
        const cwd = opts.cwd;
        const absolutePath = path.resolve(cwd, filePath);

        if (!absolutePath.startsWith(cwd)) {
          return reply.code(400).send({
            success: false,
            error: 'File path is outside of the project directory.',
          });
        }

        await fs.writeFile(absolutePath, content, 'utf-8');

        return reply.send({
          success: true,
          data: {
            message: 'File updated successfully.',
            filePath,
          },
        });
      } catch (error) {
        debug(`File edit API error:`, error);
        return reply.code(500).send({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while editing file.',
        });
      }
    },
  );
};

export default filesRoute;
