import { compact } from '../../compact';
import {
  CANCELED_MESSAGE_TEXT,
  PLAN_MODE_EVENTS,
  TOOL_NAMES,
} from '../../constants';
import type { Context } from '../../context';
import { JsonlLogger } from '../../jsonl';
import type { StreamResult } from '../../loop';
import type { NormalizedMessage } from '../../message';
import type { MessageBus } from '../../messageBus';
import { PluginHookType } from '../../plugin';
import { Project } from '../../project';
import { resolveModelWithContext } from '../../provider/model';
import { SessionConfigManager } from '../../session';
import type { ApprovalCategory, ToolUse } from '../../tool';
import { randomUUID } from '../../utils/randomUUID';
import { normalizeProviders } from './providers';

function buildSignalKey(cwd: string, sessionId: string) {
  return `${cwd}/${sessionId}`;
}

export function registerSessionHandlers(
  messageBus: MessageBus,
  getContext: (cwd: string) => Promise<Context>,
  abortControllers: Map<string, AbortController>,
) {
  messageBus.registerHandler('session.initialize', async (data) => {
    const context = await getContext(data.cwd);
    await context.apply({
      hook: 'initialized',
      args: [{ cwd: data.cwd, quiet: false }],
      type: PluginHookType.Series,
    });
    const m = (
      await messageBus.messageHandlers.get('session.getModel')?.({
        cwd: data.cwd,
        sessionId: data.sessionId,
      })
    )?.data.model;
    const { model, providers, error } = await resolveModelWithContext(
      m,
      context,
    );

    let thinkingLevel: string | undefined = undefined;
    const variants = model?.model.variants;
    if (variants && Object.keys(variants).length > 0) {
      const availableEfforts = Object.keys(variants);
      const configuredLevel = context.config.thinkingLevel;

      let targetLevel: string | undefined = configuredLevel;
      if (configuredLevel === 'maxOrXhigh') {
        targetLevel = availableEfforts.includes('xhigh')
          ? 'xhigh'
          : availableEfforts.includes('max')
            ? 'max'
            : undefined;
      }

      if (targetLevel && availableEfforts.includes(targetLevel)) {
        thinkingLevel = targetLevel;
      } else {
        thinkingLevel = availableEfforts[0];
      }
    }

    let sessionSummary: string | undefined;
    let pastedTextMap: Record<string, string> = {};
    let pastedImageMap: Record<string, string> = {};
    if (data.sessionId) {
      try {
        const sessionConfigManager = new SessionConfigManager({
          logPath: context.paths.getSessionLogPath(data.sessionId),
        });
        sessionSummary = sessionConfigManager.config.summary;
        pastedTextMap = sessionConfigManager.config.pastedTextMap || {};
        pastedImageMap = sessionConfigManager.config.pastedImageMap || {};
      } catch {
        // Silently ignore if session config not available
      }
    }

    return {
      success: true,
      data: {
        productName: context.productName,
        productASCIIArt: context.productASCIIArt,
        version: context.version,
        model,
        planModel: context.config.planModel,
        initializeModelError: error instanceof Error ? error.message : null,
        providers: normalizeProviders(providers, context),
        approvalMode: context.config.approvalMode,
        sessionSummary,
        pastedTextMap,
        pastedImageMap,
        thinkingLevel,
      },
    };
  });

  messageBus.registerHandler('session.messages.list', async (data) => {
    const { cwd, sessionId } = data;
    const context = await getContext(cwd);
    const { loadSessionMessages } = await import('../../session');
    const messages = loadSessionMessages({
      logPath: context.paths.getSessionLogPath(sessionId),
    });
    return {
      success: true,
      data: {
        messages,
      },
    };
  });

  messageBus.registerHandler('session.export', async (data) => {
    const { cwd, sessionId } = data;
    const context = await getContext(cwd);

    const { loadSessionMessages } = await import('../../session');
    const { renderSessionMarkdown } = await import(
      '../../utils/renderSessionMarkdown'
    );
    const { join } = await import('pathe');
    const { writeFileSync, existsSync, mkdirSync } = await import('node:fs');

    if (!sessionId) {
      return { success: false, error: 'No active session' };
    }

    const logPath = context.paths.getSessionLogPath(sessionId);

    const messages = loadSessionMessages({
      logPath,
    });

    if (!messages || messages.length === 0) {
      return { success: false, error: 'No messages to export' };
    }

    const { statSync } = await import('node:fs');
    const stats = statSync(logPath);

    let summary = '';
    try {
      const sessionConfigManager = new SessionConfigManager({ logPath });
      summary = sessionConfigManager.config.summary || '';
    } catch {
      // ignore
    }

    const modelStr =
      (
        await messageBus.messageHandlers.get('session.getModel')?.({
          cwd,
          sessionId,
        })
      )?.data.model || null;

    const content = renderSessionMarkdown({
      sessionId,
      title: summary,
      projectPath: cwd,
      model: modelStr,
      messages,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
    });
    const outDir = join(cwd, '.log-outputs');
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    const filePath = join(outDir, `session-${sessionId.slice(0, 8)}.md`);

    writeFileSync(filePath, content, 'utf-8');

    return { success: true, data: { filePath } };
  });

  messageBus.registerHandler('session.getModel', async (data) => {
    const { cwd, sessionId, includeModelInfo = false } = data;
    const context = await getContext(cwd);
    const sessionConfigManager = new SessionConfigManager({
      logPath: context.paths.getSessionLogPath(sessionId),
    });
    const modelStr =
      context.argvConfig?.model ||
      sessionConfigManager.config.model ||
      context.config.model;
    if (includeModelInfo) {
      const { model, providers, error } = await resolveModelWithContext(
        modelStr,
        context,
      );
      if (error) {
        return {
          success: false,
          error,
        };
      } else {
        return {
          success: true,
          data: {
            model: modelStr,
            modelInfo: model,
            providers,
          },
        };
      }
    }
    return {
      success: true,
      data: {
        model: modelStr,
      },
    };
  });

  messageBus.registerHandler('session.send', async (data) => {
    const {
      message,
      cwd,
      sessionId,
      model,
      attachments,
      parentUuid,
      planMode,
      thinking,
      outputStyle,
    } = data;
    const context = await getContext(cwd);

    context
      .apply({
        hook: 'telemetry',
        args: [
          {
            name: 'send',
            payload: {
              message,
              sessionId,
            },
          },
        ],
        type: PluginHookType.Parallel,
      })
      .catch(() => {});

    const project = new Project({
      sessionId,
      context,
    });

    const resolvedModel =
      model ||
      (
        await messageBus.messageHandlers.get('session.getModel')?.({
          cwd,
          sessionId,
        })
      )?.data.model;

    if (resolvedModel) {
      const maxStorage = (context.config.recentModels ?? 10) + 10;
      context.globalData.addRecentModel(resolvedModel, maxStorage);
    }

    const abortController = new AbortController();
    const key = buildSignalKey(cwd, project.session.id);
    abortControllers.set(key, abortController);

    let prependContent:
      | Array<{ type: 'text'; text: string; hidden?: boolean }>
      | undefined;

    if (planMode && message !== null) {
      const { generatePlanPrompt } = await import('../../planPrompt');
      const { createPlanFileManager } = await import('../../planFile');

      const planFileManager = createPlanFileManager({
        context,
        sessionId: project.session.id,
      });
      const planFilePath = planFileManager.getPlanFilePath();
      const planExists = planFileManager.planExists();

      const planPrompt = generatePlanPrompt({
        productName: context.productName,
        language: context.config.language,
        planFilePath,
        planExists,
        isReentry: planExists,
      });

      prependContent = [
        {
          type: 'text',
          text: `<system-reminder>\n${planPrompt}\n</system-reminder>`,
          hidden: true,
        },
      ];
    }

    const result = await project.send(message, {
      attachments,
      model: resolvedModel,
      parentUuid,
      prependContent,
      thinking,
      outputStyle,
      onMessage: async (opts) => {
        await messageBus.emitEvent('message', {
          message: opts.message,
          sessionId,
          cwd,
        });
      },
      onTextDelta: async (text) => {
        await messageBus.emitEvent('textDelta', {
          text,
          sessionId,
          cwd,
        });
      },
      onChunk: async (chunk, requestId) => {
        await messageBus.emitEvent('chunk', {
          chunk,
          requestId,
          sessionId,
          cwd,
        });
      },
      onToolApprove: async ({
        toolUse,
        category,
      }: {
        toolUse: ToolUse;
        category?: ApprovalCategory;
      }) => {
        if (toolUse.name === TOOL_NAMES.EXIT_PLAN_MODE) {
          try {
            const { createPlanFileManager } = await import('../../planFile');
            const planFileManager = createPlanFileManager({
              context,
              sessionId: project.session.id,
            });

            const planFilePath = planFileManager.getPlanFilePath();
            const planContent = planFileManager.readPlan();

            await messageBus.emitEvent(PLAN_MODE_EVENTS.PREVIEW_PLAN, {
              sessionId: project.session.id,
              planFilePath,
              planContent,
              timestamp: Date.now(),
            });
          } catch (error) {
            console.error('Failed to emit plan.preview event:', error);
          }
        }

        const result = await messageBus.request('toolApproval', {
          toolUse,
          category,
          sessionId,
        });

        if (result.params || result.denyReason) {
          return {
            approved: result.approved,
            params: result.params,
            denyReason: result.denyReason,
          };
        }

        return result.approved;
      },
      onStreamResult: async (result: StreamResult) => {
        await messageBus.emitEvent('streamResult', {
          result,
          sessionId,
          cwd,
        });
      },
      signal: abortController.signal,
    });
    abortControllers.delete(key);

    messageBus.emitEvent('session.done', {
      sessionId,
      result: {
        type: 'result',
        subtype: result.success ? 'success' : 'error',
        isError: !result.success,
        content: result.success
          ? result.data?.text || ''
          : result.error?.message || 'Unknown error',
        sessionId,
      },
    });

    return result;
  });

  messageBus.registerHandler('session.cancel', async (data) => {
    const { cwd, sessionId } = data;
    const key = buildSignalKey(cwd, sessionId);
    const abortController = abortControllers.get(key);
    abortController?.abort();
    abortControllers.delete(key);

    const context = await getContext(cwd);
    const jsonlLogger = new JsonlLogger({
      filePath: context.paths.getSessionLogPath(sessionId),
    });

    const { loadSessionMessages } = await import('../../session');
    const { findIncompleteToolUses } = await import('../../message');

    const messages = loadSessionMessages({
      logPath: context.paths.getSessionLogPath(sessionId),
    });

    const incompleteResult = findIncompleteToolUses(messages);
    if (incompleteResult) {
      const { assistantMessage, incompleteToolUses } = incompleteResult;

      for (const toolUse of incompleteToolUses) {
        const normalizedToolResultMessage: NormalizedMessage & {
          sessionId: string;
        } = {
          parentUuid: assistantMessage.uuid,
          uuid: randomUUID(),
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: toolUse.id,
              toolName: toolUse.name,
              input: toolUse.input,
              result: {
                llmContent: CANCELED_MESSAGE_TEXT,
                returnDisplay: 'Tool execution was canceled by user.',
                isError: true,
              },
            },
          ],
          type: 'message',
          timestamp: new Date().toISOString(),
          sessionId,
        };

        await messageBus.emitEvent('message', {
          message: jsonlLogger.addMessage({
            message: normalizedToolResultMessage,
          }),
        });
      }

      return {
        success: true,
      };
    }

    await messageBus.emitEvent('message', {
      message: jsonlLogger.addUserMessage(CANCELED_MESSAGE_TEXT, sessionId),
    });

    return {
      success: true,
    };
  });

  messageBus.registerHandler('session.addMessages', async (data) => {
    const { cwd, sessionId, messages, parentUuid } = data;
    const context = await getContext(cwd);
    const jsonlLogger = new JsonlLogger({
      filePath: context.paths.getSessionLogPath(sessionId),
    });

    let previousUuid = parentUuid ?? jsonlLogger.getLatestUuid();

    for (const message of messages) {
      const normalizedMessage = {
        // @ts-expect-error
        parentUuid: message.parentUuid ?? previousUuid,
        uuid: randomUUID(),
        ...message,
        type: 'message' as const,
        timestamp: new Date().toISOString(),
        sessionId,
      };
      await messageBus.emitEvent('message', {
        message: jsonlLogger.addMessage({
          message: normalizedMessage,
        }),
        sessionId,
        cwd,
      });
      previousUuid = normalizedMessage.uuid;
    }
    return {
      success: true,
    };
  });

  messageBus.registerHandler('session.compact', async (data) => {
    const { cwd, messages, sessionId } = data;
    const context = await getContext(cwd);
    const m = (
      await messageBus.messageHandlers.get('session.getModel')?.({
        cwd,
        sessionId,
      })
    )?.data.model;
    const model = (await resolveModelWithContext(m, context)).model!;
    const summary = await compact({
      messages,
      model,
    });
    return {
      success: true,
      data: {
        summary,
      },
    };
  });

  messageBus.registerHandler('session.config.setApprovalMode', async (data) => {
    const { cwd, sessionId, approvalMode } = data;
    const context = await getContext(cwd);
    const sessionConfigManager = new SessionConfigManager({
      logPath: context.paths.getSessionLogPath(sessionId),
    });
    sessionConfigManager.config.approvalMode = approvalMode;
    sessionConfigManager.write();
    return {
      success: true,
    };
  });

  messageBus.registerHandler(
    'session.config.addApprovalTools',
    async (data) => {
      const { cwd, sessionId, approvalTool } = data;
      const context = await getContext(cwd);
      const sessionConfigManager = new SessionConfigManager({
        logPath: context.paths.getSessionLogPath(sessionId),
      });
      if (!sessionConfigManager.config.approvalTools.includes(approvalTool)) {
        sessionConfigManager.config.approvalTools.push(approvalTool);
        sessionConfigManager.write();
      }
      return {
        success: true,
      };
    },
  );

  messageBus.registerHandler('session.config.setSummary', async (data) => {
    const { cwd, sessionId, summary } = data;
    const context = await getContext(cwd);
    const sessionConfigManager = new SessionConfigManager({
      logPath: context.paths.getSessionLogPath(sessionId),
    });
    sessionConfigManager.config.summary = summary;
    sessionConfigManager.write();
    return {
      success: true,
    };
  });

  messageBus.registerHandler(
    'session.config.setPastedTextMap',
    async (data) => {
      const { cwd, sessionId, pastedTextMap } = data;
      const context = await getContext(cwd);
      const sessionConfigManager = new SessionConfigManager({
        logPath: context.paths.getSessionLogPath(sessionId),
      });
      sessionConfigManager.config.pastedTextMap = pastedTextMap;
      sessionConfigManager.write();
      return {
        success: true,
      };
    },
  );

  messageBus.registerHandler(
    'session.config.setPastedImageMap',
    async (data) => {
      const { cwd, sessionId, pastedImageMap } = data;
      const context = await getContext(cwd);
      const sessionConfigManager = new SessionConfigManager({
        logPath: context.paths.getSessionLogPath(sessionId),
      });
      sessionConfigManager.config.pastedImageMap = pastedImageMap;
      sessionConfigManager.write();
      return {
        success: true,
      };
    },
  );

  messageBus.registerHandler(
    'session.config.getAdditionalDirectories',
    async (data) => {
      const { cwd, sessionId } = data;
      const context = await getContext(cwd);
      const sessionConfigManager = new SessionConfigManager({
        logPath: context.paths.getSessionLogPath(sessionId),
      });
      return {
        success: true,
        data: {
          directories: sessionConfigManager.config.additionalDirectories || [],
        },
      };
    },
  );

  messageBus.registerHandler('session.config.addDirectory', async (data) => {
    const { cwd, sessionId, directory } = data;
    const context = await getContext(cwd);
    const sessionConfigManager = new SessionConfigManager({
      logPath: context.paths.getSessionLogPath(sessionId),
    });
    const directories = sessionConfigManager.config.additionalDirectories || [];
    if (!directories.includes(directory)) {
      directories.push(directory);
      sessionConfigManager.config.additionalDirectories = directories;
      sessionConfigManager.write();
    }
    return {
      success: true,
    };
  });

  messageBus.registerHandler('session.config.removeDirectory', async (data) => {
    const { cwd, sessionId, directory } = data;
    const context = await getContext(cwd);
    const sessionConfigManager = new SessionConfigManager({
      logPath: context.paths.getSessionLogPath(sessionId),
    });
    const directories = sessionConfigManager.config.additionalDirectories || [];
    sessionConfigManager.config.additionalDirectories = directories.filter(
      (dir) => dir !== directory,
    );
    sessionConfigManager.write();
    return {
      success: true,
    };
  });

  messageBus.registerHandler('session.config.set', async (data) => {
    const { cwd, sessionId, key, value } = data;
    const context = await getContext(cwd);
    const sessionConfigManager = new SessionConfigManager({
      logPath: context.paths.getSessionLogPath(sessionId),
    });
    (sessionConfigManager.config as any)[key] = value;
    sessionConfigManager.write();
    return {
      success: true,
    };
  });

  messageBus.registerHandler('session.config.get', async (data) => {
    const { cwd, sessionId, key } = data;
    const context = await getContext(cwd);
    const logPath = context.paths.getSessionLogPath(sessionId);
    const sessionConfigManager = new SessionConfigManager({
      logPath,
    });
    const value = key
      ? (sessionConfigManager.config as any)[key]
      : sessionConfigManager.config;
    return {
      success: true,
      data: {
        value,
      },
    };
  });

  messageBus.registerHandler('session.config.remove', async (data) => {
    const { cwd, sessionId, key } = data;
    const context = await getContext(cwd);
    const sessionConfigManager = new SessionConfigManager({
      logPath: context.paths.getSessionLogPath(sessionId),
    });
    delete (sessionConfigManager.config as any)[key];
    sessionConfigManager.write();
    return {
      success: true,
    };
  });

  messageBus.registerHandler('sessions.remove', async (data) => {
    const { cwd, sessionId } = data;
    try {
      const context = await getContext(cwd);
      const { unlinkSync, existsSync } = await import('fs');
      const logPath = context.paths.getSessionLogPath(sessionId);

      if (!existsSync(logPath)) {
        return {
          success: false,
          error: `Session "${sessionId}" not found`,
        };
      }

      unlinkSync(logPath);

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove session',
      };
    }
  });

  messageBus.registerHandler('sessions.list', async (data) => {
    const { cwd } = data;
    const context = await getContext(cwd);
    const sessions = context.paths.getAllSessions();
    return {
      success: true,
      data: {
        sessions,
      },
    };
  });

  messageBus.registerHandler('sessions.resume', async (data) => {
    const { cwd, sessionId } = data;
    const context = await getContext(cwd);
    return {
      success: true,
      data: {
        sessionId,
        logFile: context.paths.getSessionLogPath(sessionId),
      },
    };
  });
}
