import type { Plugin } from '../plugin';

export const hookLoggerPlugin: Plugin = {
  name: 'hookLogger',

  stop(opts) {
    console.log('[hookLogger] stop', {
      sessionId: opts.sessionId,
      success: opts.result.success,
      turnsCount: opts.turnsCount,
      toolCallsCount: opts.toolCallsCount,
      duration: opts.duration,
      model: opts.model,
    });
  },

  subagentStop(opts) {
    console.log('[hookLogger] subagentStop', {
      parentSessionId: opts.parentSessionId,
      agentId: opts.agentId,
      agentType: opts.agentType,
      status: opts.result.status,
      totalToolCalls: opts.totalToolCalls,
      totalDuration: opts.totalDuration,
      model: opts.model,
    });
  },
};
