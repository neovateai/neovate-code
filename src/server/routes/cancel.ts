import { Type } from '@sinclair/typebox';
import createDebug from 'debug';
import { FastifyPluginAsync } from 'fastify';
import type { RouteCompletionsOpts } from '../types';

const debug = createDebug('takumi:server:routes:cancel');

const CancelRequestSchema = Type.Object({
  id: Type.String(),
});

const SuccessResponseSchema = Type.Object({
  success: Type.Boolean(),
});

// 存储活跃的请求ID和对应的AbortController
const activeRequests = new Map<string, AbortController>();

// 添加请求到活跃请求列表
export function addActiveRequest(id: string, controller: AbortController) {
  activeRequests.set(id, controller);
  debug(
    `Added request ${id} to active requests. Total: ${activeRequests.size}`,
  );
}

// 从活跃请求列表中移除请求
export function removeActiveRequest(id: string) {
  activeRequests.delete(id);
  debug(
    `Removed request ${id} from active requests. Total: ${activeRequests.size}`,
  );
}

// 取消请求
export function cancelRequest(id: string): boolean {
  const controller = activeRequests.get(id);
  if (controller) {
    debug(`Cancelling request ${id}`);
    controller.abort();
    activeRequests.delete(id);
    return true;
  }
  debug(`Request ${id} not found in active requests`);
  return false;
}

const cancelRoute: FastifyPluginAsync<RouteCompletionsOpts> = async (
  app,
  opts,
) => {
  app.post<{ Body: { id: string } }>(
    '/chat/cancel',
    {
      schema: {
        body: CancelRequestSchema,
        response: {
          200: SuccessResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.body;
      debug(`Received cancel request for id: ${id}`);

      const canceled = cancelRequest(id);

      return {
        success: canceled,
      };
    },
  );
};

export default cancelRoute;
