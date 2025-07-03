import React, { useEffect, useRef } from 'react';
import { isReasoningModel } from '../../provider';
import { query } from '../../query';
import { isSlashCommand, parseSlashCommand } from '../../slash-commands';
import { createStableToolKey } from '../../utils/formatToolUse';
import { useAppContext } from '../AppContext';
import {
  APP_STATUS,
  MESSAGE_ROLES,
  MESSAGE_TYPES,
  TOOL_DESCRIPTION_EXTRACTORS,
} from '../constants';

export function useChatActions() {
  const { state, dispatch, services } = useAppContext();

  const latestStateRef = useRef(state);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  const addHistory = (input: string) => {
    dispatch({ type: 'ADD_HISTORY', payload: input });
  };

  const chatInputUp = (input: string): string => {
    if (state.history.length === 0) {
      return input;
    }

    let historyIndex = null;
    if (state.historyIndex === null) {
      dispatch({ type: 'SET_DRAFT_INPUT', payload: input });
      historyIndex = state.history.length - 1;
    } else {
      historyIndex = Math.max(state.historyIndex - 1, 0);
    }
    dispatch({ type: 'SET_HISTORY_INDEX', payload: historyIndex });
    return state.history[historyIndex!];
  };

  const chatInputDown = (input: string): string => {
    if (state.historyIndex === null) {
      return input;
    }

    if (state.historyIndex === state.history.length - 1) {
      dispatch({ type: 'SET_HISTORY_INDEX', payload: null });
      return state.draftInput || '';
    }

    dispatch({ type: 'SET_HISTORY_INDEX', payload: state.historyIndex + 1 });
    return state.history[state.historyIndex + 1];
  };

  const chatInputChange = (input: string) => {
    dispatch({ type: 'SET_HISTORY_INDEX', payload: null });
  };

  const processUserInput = async (
    input: string,
    setSlashCommandJSX?: (jsx: React.ReactNode) => void,
  ): Promise<any> => {
    dispatch({ type: 'SET_HISTORY_INDEX', payload: null });
    // services.context.addHistory(input);
    addHistory(input);

    // Check if input is a slash command
    if (isSlashCommand(input)) {
      return handleSlashCommand(input, setSlashCommandJSX);
    }

    // Regular query processing
    return executeQuery(input);
  };

  const handleSlashCommand = async (
    input: string,
    setSlashCommandJSX?: (jsx: React.ReactNode) => void,
  ): Promise<any> => {
    const parsed = parseSlashCommand(input);
    if (!parsed) {
      return executeQuery(input);
    }

    const command = services.context.slashCommands.get(parsed.command);
    if (!command) {
      // Command not found
      dispatch({ type: 'SET_STATUS', payload: APP_STATUS.PROCESSING });
      dispatch({ type: 'SET_ERROR', payload: null });

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: MESSAGE_ROLES.USER,
          content: {
            type: MESSAGE_TYPES.TEXT,
            text: input,
          },
        },
      });

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: MESSAGE_ROLES.ASSISTANT,
          content: {
            type: MESSAGE_TYPES.TEXT,
            text: `Unknown command: /${parsed.command}. Type /help to see available commands.`,
          },
        },
      });

      dispatch({ type: 'SET_STATUS', payload: APP_STATUS.COMPLETED });
      return { finalText: `Unknown command: /${parsed.command}` };
    }

    dispatch({ type: 'SET_STATUS', payload: APP_STATUS.PROCESSING });
    dispatch({ type: 'SET_ERROR', payload: null });

    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        role: MESSAGE_ROLES.USER,
        content: {
          type: MESSAGE_TYPES.TEXT,
          text: input,
        },
      },
    });

    try {
      if (command.type === 'local') {
        const result = await command.call(parsed.args, services.context);
        if (result) {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              role: MESSAGE_ROLES.ASSISTANT,
              content: {
                type: MESSAGE_TYPES.TEXT,
                text: result,
              },
            },
          });
        }
        dispatch({ type: 'SET_STATUS', payload: APP_STATUS.COMPLETED });
        return { finalText: result };
      } else if (command.type === 'local-jsx') {
        const jsx = await command.call((result: string) => {
          if (setSlashCommandJSX) {
            setSlashCommandJSX(null);
          }
          if (result) {
            dispatch({
              type: 'ADD_MESSAGE',
              payload: {
                role: MESSAGE_ROLES.ASSISTANT,
                content: {
                  type: MESSAGE_TYPES.TEXT,
                  text: result,
                },
              },
            });
          }
          dispatch({ type: 'SET_STATUS', payload: APP_STATUS.COMPLETED });
        }, services.context);

        if (setSlashCommandJSX) {
          setSlashCommandJSX(jsx);
        }
        dispatch({
          type: 'SET_STATUS',
          payload: APP_STATUS.AWAITING_USER_INPUT,
        });
        return { finalText: '' };
      } else if (command.type === 'prompt') {
        const messages = await command.getPromptForCommand(parsed.args);
        // Convert to the format expected by query function
        const queryInput = messages.map((msg) => ({
          role: msg.role as 'user',
          content: msg.content,
        }));

        // Continue with regular AI processing using internal query
        return executeQuery(queryInput);
      }
    } catch (e: any) {
      dispatch({ type: 'SET_STATUS', payload: APP_STATUS.FAILED });
      dispatch({ type: 'SET_ERROR', payload: e.message || String(e) });
      dispatch({ type: 'SET_CURRENT_MESSAGE', payload: null });
      throw e;
    }
  };

  const executeQuery = async (
    input: string | any[],
    forceStage?: 'plan' | 'code',
  ): Promise<any> => {
    // Prepare input for query function
    let queryInput;
    if (typeof input === 'string') {
      // Add to history only if it's a string (user input)
      // dispatch({ type: 'SET_HISTORY_INDEX', payload: null });
      // services.context.addHistory(input);
      queryInput = [
        {
          role: 'user',
          content: input,
        },
      ];
    } else {
      queryInput = input;
    }

    const stage = forceStage || state.stage;
    const service = stage === 'plan' ? services.planService : services.service;
    let textDelta = '';
    let reasoningDelta = '';

    dispatch({ type: 'SET_STATUS', payload: APP_STATUS.PROCESSING });
    dispatch({ type: 'SET_ERROR', payload: null });

    // Add user message only for string input
    if (typeof input === 'string') {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: MESSAGE_ROLES.USER,
          content: {
            type: MESSAGE_TYPES.TEXT,
            text: input,
          },
        },
      });
    }

    try {
      const result = await query({
        input: queryInput,
        service,
        thinking: isReasoningModel(service.context.config.model),
        async onTextDelta(text) {
          if (reasoningDelta && state.currentMessage) {
            reasoningDelta = '';
            dispatch({ type: 'ADD_MESSAGE', payload: state.currentMessage });
            dispatch({ type: 'CLEAR_CURRENT_MESSAGE' });
          }
          textDelta += text;
          dispatch({
            type: 'SET_CURRENT_MESSAGE',
            payload: {
              role: MESSAGE_ROLES.ASSISTANT,
              content: {
                type: MESSAGE_TYPES.TEXT,
                text: textDelta,
              },
            },
          });
        },
        async onText(text) {
          dispatch({ type: 'CLEAR_CURRENT_MESSAGE' });
          textDelta = '';
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              role: MESSAGE_ROLES.ASSISTANT,
              content: {
                type: MESSAGE_TYPES.TEXT,
                text,
              },
            },
          });
        },
        async onReasoning(text) {
          reasoningDelta += text;
          dispatch({
            type: 'SET_CURRENT_MESSAGE',
            payload: {
              role: MESSAGE_ROLES.ASSISTANT,
              content: {
                type: MESSAGE_TYPES.THINKING,
                text: reasoningDelta,
              },
            },
          });
        },
        async onToolUse(callId, name, params, cwd) {
          // Set executing tool info and status
          const getDescription =
            TOOL_DESCRIPTION_EXTRACTORS[
              name as keyof typeof TOOL_DESCRIPTION_EXTRACTORS
            ];
          const description = getDescription
            ? getDescription(params, cwd)
            : JSON.stringify(params);

          dispatch({
            type: 'SET_CURRENT_EXECUTING_TOOL',
            payload: { name, description },
          });
          dispatch({ type: 'SET_STATUS', payload: APP_STATUS.TOOL_EXECUTING });

          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              role: MESSAGE_ROLES.ASSISTANT,
              content: {
                type: MESSAGE_TYPES.TOOL_CALL,
                toolCallId: callId,
                toolName: name,
                args: params,
              },
            },
          });
        },
        onToolUseResult(callId, name, result) {
          // Clear executing tool info and return to processing
          dispatch({ type: 'SET_CURRENT_EXECUTING_TOOL', payload: null });
          dispatch({ type: 'SET_STATUS', payload: APP_STATUS.PROCESSING });

          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              role: MESSAGE_ROLES.TOOL,
              content: {
                type: MESSAGE_TYPES.TOOL_RESULT,
                toolCallId: callId,
                toolName: name,
                result,
              },
            },
          });
        },
        async onToolApprove(callId, name, params) {
          // Check approval memory first
          const toolKey = createStableToolKey(name, params);
          const toolOnlyKey = name;

          if (
            latestStateRef.current.approvalMemory.proceedAlways.has(toolKey) ||
            latestStateRef.current.approvalMemory.proceedAlwaysTool.has(
              toolOnlyKey,
            )
          ) {
            return true;
          }

          if (latestStateRef.current.approvalMemory.proceedOnce.has(toolKey)) {
            dispatch({
              type: 'REMOVE_APPROVAL_MEMORY',
              payload: { type: 'once', key: toolKey },
            });
            return true;
          }

          // Show approval prompt
          dispatch({
            type: 'SET_STATUS',
            payload: APP_STATUS.AWAITING_USER_INPUT,
          });
          dispatch({
            type: 'SET_APPROVAL_PENDING',
            payload: {
              pending: true,
              callId,
              toolName: name,
              params,
            },
          });

          return new Promise<boolean>((resolve) => {
            dispatch({
              type: 'SET_APPROVAL_PENDING',
              payload: {
                pending: true,
                callId,
                toolName: name,
                params,
                resolve,
              },
            });
          });
        },
      });

      // Check if tool was denied
      if (result.denied) {
        dispatch({
          type: 'SET_STATUS',
          payload: APP_STATUS.AWAITING_USER_INPUT,
        });
        dispatch({ type: 'SET_CURRENT_MESSAGE', payload: null });
        return result;
      }

      dispatch({ type: 'SET_STATUS', payload: APP_STATUS.COMPLETED });
      if (stage === 'plan') {
        dispatch({
          type: 'SET_PLAN_MODAL',
          payload: { text: result.finalText || '' },
        });
      }
      return result;
    } catch (e: any) {
      dispatch({ type: 'SET_STATUS', payload: APP_STATUS.FAILED });
      dispatch({ type: 'SET_ERROR', payload: e.message || String(e) });
      dispatch({ type: 'SET_CURRENT_MESSAGE', payload: null });
      throw e;
    }
  };

  return {
    addHistory,
    chatInputUp,
    chatInputDown,
    chatInputChange,
    processUserInput,
    executeQuery,
  };
}
