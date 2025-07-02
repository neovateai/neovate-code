import { Type } from '@sinclair/typebox';
import createDebug from 'debug';
import { FastifyPluginAsync } from 'fastify';
import { getToolApprovalService } from '../services/tool-approval';
import type { RouteCompletionsOpts } from '../types';

const debug = createDebug('takumi:server:routes:tool-approval');

// 定义请求和响应的类型
const CheckToolApprovalSchema = Type.Object({
  toolName: Type.String(),
  params: Type.Optional(Type.Record(Type.String(), Type.Any())),
});

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

const CleanupSchema = Type.Object({
  maxAgeMs: Type.Optional(Type.Number()),
});

// 错误响应类型
const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  code: Type.String(),
});

// 成功响应类型
const SuccessResponseSchema = Type.Object({
  success: Type.Boolean(),
});

const toolApprovalRoute: FastifyPluginAsync<RouteCompletionsOpts> = async (
  app,
  opts,
) => {
  // 获取工具审批服务实例
  const getService = () => getToolApprovalService(opts.context);

  // 统一错误处理函数
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

  // 检查工具是否需要审批
  app.post<{ Body: { toolName: string; params?: Record<string, any> } }>(
    '/tool-approval/check',
    {
      schema: {
        body: CheckToolApprovalSchema,
        response: {
          200: Type.Object({
            needsApproval: Type.Boolean(),
          }),
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { toolName, params = {} } = request.body;

        const service = getService();
        const needsApproval = await service.shouldApprove(toolName, params);

        debug(`Tool approval check: ${toolName} -> ${needsApproval}`);
        return { needsApproval };
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );

  // 提交审批结果
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

  // 获取所有待审批的工具调用
  app.get(
    '/tool-approval/pending',
    {
      schema: {
        response: {
          200: Type.Object({
            pendingApprovals: Type.Array(
              Type.Object({
                callId: Type.String(),
                toolName: Type.String(),
                params: Type.Record(Type.String(), Type.Any()),
                timestamp: Type.Number(),
              }),
            ),
          }),
          500: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const service = getService();
        const pendingApprovals = service.getAllPendingApprovals();

        // 不返回 resolve 函数，只返回必要的信息
        const safeApprovals = pendingApprovals.map((approval) => ({
          callId: approval.callId,
          toolName: approval.toolName,
          params: approval.params,
          timestamp: approval.timestamp,
        }));

        return { pendingApprovals: safeApprovals };
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );

  // 获取特定的待审批工具调用
  app.get<{ Params: { callId: string } }>(
    '/tool-approval/pending/:callId',
    {
      schema: {
        params: Type.Object({
          callId: Type.String(),
        }),
        response: {
          200: Type.Object({
            pendingApproval: Type.Object({
              callId: Type.String(),
              toolName: Type.String(),
              params: Type.Record(Type.String(), Type.Any()),
              timestamp: Type.Number(),
            }),
          }),
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { callId } = request.params;

        const service = getService();
        const pendingApproval = service.getPendingApproval(callId);

        if (!pendingApproval) {
          return reply.status(404).send({
            error: 'Pending approval not found',
            code: 'APPROVAL_NOT_FOUND',
          });
        }

        // 不返回 resolve 函数
        const safeApproval = {
          callId: pendingApproval.callId,
          toolName: pendingApproval.toolName,
          params: pendingApproval.params,
          timestamp: pendingApproval.timestamp,
        };

        return { pendingApproval: safeApproval };
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );

  // 取消特定的待审批请求
  app.delete<{ Params: { callId: string } }>(
    '/tool-approval/pending/:callId',
    {
      schema: {
        params: Type.Object({
          callId: Type.String(),
        }),
        response: {
          200: SuccessResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { callId } = request.params;

        const service = getService();
        const success = service.cancelApproval(callId);

        if (!success) {
          return reply.status(404).send({
            error: 'Pending approval not found',
            code: 'APPROVAL_NOT_FOUND',
          });
        }

        debug(`Cancelled approval: ${callId}`);
        return { success: true };
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );

  // 清除所有待审批请求
  app.delete(
    '/tool-approval/pending',
    {
      schema: {
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            clearedCount: Type.Number(),
          }),
          500: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const service = getService();
        const clearedCount = service.clearAllPendingApprovals();

        debug(`Cleared all pending approvals: ${clearedCount}`);
        return { success: true, clearedCount };
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );

  // 清理过期的待审批请求
  app.post<{ Body: { maxAgeMs?: number } }>(
    '/tool-approval/cleanup',
    {
      schema: {
        body: CleanupSchema,
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            cleanedCount: Type.Number(),
            maxAgeMs: Type.Number(),
          }),
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { maxAgeMs } = request.body;

        // 验证 maxAgeMs 参数
        let ageLimit = 30 * 60 * 1000; // 默认 30 分钟
        if (maxAgeMs !== undefined) {
          if (typeof maxAgeMs !== 'number' || maxAgeMs <= 0) {
            return reply.status(400).send({
              error: 'maxAgeMs must be a positive number',
              code: 'INVALID_MAX_AGE',
            });
          }
          ageLimit = maxAgeMs;
        }

        const service = getService();
        const cleanedCount = service.cleanupStaleApprovals(ageLimit);

        debug(`Cleaned up stale approvals: ${cleanedCount}`);
        return { success: true, cleanedCount, maxAgeMs: ageLimit };
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );

  // 清除审批记忆
  app.delete(
    '/tool-approval/memory',
    {
      schema: {
        response: {
          200: SuccessResponseSchema,
          500: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const service = getService();
        service.clearApprovalMemory();

        debug('Cleared approval memory');
        return { success: true };
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );

  // 获取服务状态
  app.get(
    '/tool-approval/status',
    {
      schema: {
        response: {
          200: Type.Object({
            status: Type.Object({
              pendingCount: Type.Number(),
              memorySize: Type.Object({
                proceedOnce: Type.Number(),
                proceedAlways: Type.Number(),
                proceedAlwaysTool: Type.Number(),
              }),
              config: Type.Record(Type.String(), Type.Any()),
              isDestroyed: Type.Boolean(),
            }),
          }),
          500: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const service = getService();
        const status = service.getStatus();

        return { status };
      } catch (error) {
        return handleError(error, reply);
      }
    },
  );

  // 健康检查
  app.get(
    '/tool-approval/health',
    {
      schema: {
        response: {
          200: Type.Object({
            status: Type.Literal('healthy'),
            timestamp: Type.String(),
          }),
          503: Type.Union([
            Type.Object({
              status: Type.Literal('unhealthy'),
              reason: Type.String(),
            }),
            ErrorResponseSchema,
          ]),
        },
      },
    },
    async (request, reply) => {
      try {
        const service = getService();
        const status = service.getStatus();

        if (status.isDestroyed) {
          return reply.status(503).send({
            status: 'unhealthy' as const,
            reason: 'Service is destroyed',
          });
        }

        return {
          status: 'healthy' as const,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        debug('Error in /health:', error);
        return reply.status(503).send({
          status: 'unhealthy' as const,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );
};

export default toolApprovalRoute;
