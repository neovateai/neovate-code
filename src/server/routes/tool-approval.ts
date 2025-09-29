import { Type } from '@sinclair/typebox';
import createDebug from 'debug';
import type { FastifyPluginAsync } from 'fastify';
import { getToolApprovalService } from '../services/tool-approval';
import type { RouteCompletionsOpts } from '../types';

const debug = createDebug('takumi:server:routes:tool-approval');

const SubmitToolApprovalSchema = Type.Object({
  callId: Type.String(),
  approved: Type.Boolean(),
  option: Type.Optional(
    Type.Union([
      Type.Literal('once'),
      Type.Literal('always'),
      Type.Literal('always_tool'),
    ]),
  ),
});

const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  code: Type.String(),
});

const SuccessResponseSchema = Type.Object({
  success: Type.Boolean(),
});

const toolApprovalRoute: FastifyPluginAsync<RouteCompletionsOpts> = async (
  app,
  opts,
) => {
  const getService = () => getToolApprovalService(opts.context);

  const handleError = (error: unknown, reply: any) => {
    debug('Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('destroyed')) {
      return reply.status(503).send({
        error: 'Service unavailable',
        code: 'SERVICE_DESTROYED',
      });
    }

    return reply.status(500).send({
      error: errorMessage,
      code: 'INTERNAL_ERROR',
    });
  };

  app.post<{
    Body: {
      callId: string;
      approved: boolean;
      option?: 'once' | 'always' | 'always_tool';
    };
  }>(
    '/tool-approval/submit',
    {
      schema: {
        body: SubmitToolApprovalSchema,
        response: {
          200: SuccessResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { callId, approved, option = 'once' } = request.body;

        const service = getService();
        const success = service.submitApproval(callId, approved, option);

        if (!success) {
          return reply.status(404).send({
            error: 'Pending approval not found',
            code: 'APPROVAL_NOT_FOUND',
          });
        }

        debug(`Submitted approval: ${callId} -> ${approved} (${option})`);
        return { success: true };
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );
};

export default toolApprovalRoute;
