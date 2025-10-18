import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsync } from 'fastify';
import type { ContextCreateOpts } from '../../../context';
import { GlobalData } from '../../../globalData';
import { Paths } from '../../../paths';
import { loadSessionMessages, Session } from '../../../session';

const SessionInitializeRequestSchema = Type.Object({
  cwd: Type.Optional(Type.String()),
  resume: Type.Optional(Type.String()),
  continue: Type.Optional(Type.Boolean()),
});

interface SessionInitializeRequest {
  cwd?: string;
  resume?: string;
  continue?: boolean;
}

const sessionRoute: FastifyPluginAsync<ContextCreateOpts> = async (
  app,
  opts,
) => {
  app.post<{ Body: SessionInitializeRequest }>(
    '/session/initialize',
    {
      schema: {
        body: SessionInitializeRequestSchema,
      },
    },
    async (request, reply) => {
      try {
        const { body } = request;

        const cwd = body.cwd || opts.cwd;

        const paths = new Paths({
          productName: opts.productName,
          cwd,
        });

        const sessionId = (() => {
          if (body.resume) {
            return body.resume;
          }
          if (body.continue) {
            return paths.getLatestSessionId() || Session.createSessionId();
          }
          return Session.createSessionId();
        })();

        const [messages, history] = (() => {
          const logPath = paths.getSessionLogPath(sessionId);
          const messages = loadSessionMessages({ logPath });
          const globalData = new GlobalData({
            globalDataPath: paths.getGlobalDataPath(),
          });
          const history = globalData.getProjectHistory({ cwd });
          return [messages, history];
        })();

        return reply.send({
          success: true,
          data: {
            cwd,
            sessionId,
            messages,
            history,
            logFile: paths.getSessionLogPath(sessionId),
          },
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while initializing session.',
        });
      }
    },
  );
};

export default sessionRoute;
