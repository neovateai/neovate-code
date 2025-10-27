import type {
  JSONSchema7,
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2FunctionTool,
  LanguageModelV2Message,
  LanguageModelV2Prompt,
  LanguageModelV2ProviderDefinedTool,
  LanguageModelV2ToolCallPart,
  LanguageModelV2ToolChoice,
  LanguageModelV2ToolResultPart,
} from '@ai-sdk/provider';
import {
  createGenerationSpan,
  getLogger,
  type Model,
  type ModelRequest,
  type ModelResponse,
  type ModelSettingsToolChoice,
  protocol,
  type ResponseStreamEvent,
  resetCurrentSpan,
  type SerializedHandoff,
  type SerializedOutputType,
  type SerializedTool,
  setCurrentSpan,
  UserError,
} from '@openai/agents';

import { mergeConsecutiveSystemMessages } from './merge-consecutive-system-messages';
import { removeImagePrefix } from './removeImagePrefix';

const URL_PATTERN = /^https?:\/\//i;

/**
 * @internal
 * Converts a list of model items to a list of language model V2 messages.
 *
 * @param model - The model to use.
 * @param items - The items to convert.
 * @returns The list of language model V2 messages.
 */
export function itemsToLanguageV2Messages(
  model: LanguageModelV2,
  items: protocol.ModelItem[],
): LanguageModelV2Message[] {
  const messages: LanguageModelV2Message[] = [];
  let currentAssistantMessage: LanguageModelV2Message | undefined;

  for (const item of items) {
    if (item.type === 'message' || typeof item.type === 'undefined') {
      const { role, content, providerData } = item;
      if (role === 'system') {
        messages.push({
          role: 'system',
          content: content,
          providerOptions: {
            ...(providerData ?? {}),
          },
        });
        continue;
      }

      if (role === 'user') {
        messages.push({
          role,
          content:
            typeof content === 'string'
              ? [{ type: 'text', text: content }]
              : content.map((c) => {
                  const { providerData: contentProviderData } = c;
                  if (c.type === 'input_text') {
                    return {
                      type: 'text',
                      text: c.text,
                      providerOptions: {
                        ...(contentProviderData ?? {}),
                      },
                    };
                  }
                  if (c.type === 'input_image') {
                    const image =
                      typeof c.image === 'string' ? c.image : c.image.id;
                    const isGeminiModel =
                      model.modelId.includes('gemini') &&
                      model.provider === 'google.generative-ai';

                    let data: string | URL;
                    if (isGeminiModel && typeof image === 'string') {
                      data = removeImagePrefix(image);
                    } else {
                      data = new URL(image);
                    }

                    return {
                      type: 'file',
                      data,
                      mediaType: 'image/*',
                      providerOptions: {
                        ...(contentProviderData ?? {}),
                      },
                    };
                  }
                  if (c.type === 'input_file') {
                    if (typeof c.file !== 'string') {
                      throw new UserError('File ID is not supported');
                    }
                    return {
                      type: 'file',
                      file: c.file,
                      mediaType: 'application/octet-stream',
                      data: c.file,
                      providerOptions: {
                        ...(contentProviderData ?? {}),
                      },
                    };
                  }
                  throw new UserError(`Unknown content type: ${c.type}`);
                }),
          providerOptions: {
            ...(providerData ?? {}),
          },
        });
        continue;
      }

      if (role === 'assistant') {
        if (currentAssistantMessage) {
          messages.push(currentAssistantMessage);
          currentAssistantMessage = undefined;
        }

        messages.push({
          role,
          content: content
            .filter((c) => c.type === 'output_text')
            .map((c) => {
              const { providerData: contentProviderData } = c;
              return {
                type: 'text',
                text: c.text,
                providerOptions: {
                  ...(contentProviderData ?? {}),
                },
              };
            }),
          providerOptions: {
            ...(providerData ?? {}),
          },
        });
        continue;
      }

      const exhaustiveMessageTypeCheck = item satisfies never;
      throw new Error(`Unknown message type: ${exhaustiveMessageTypeCheck}`);
    } else if (item.type === 'function_call') {
      if (!currentAssistantMessage) {
        currentAssistantMessage = {
          role: 'assistant',
          content: [],
          providerOptions: {
            ...(item.providerData ?? {}),
          },
        };
      }

      if (
        Array.isArray(currentAssistantMessage.content) &&
        currentAssistantMessage.role === 'assistant'
      ) {
        const content: LanguageModelV2ToolCallPart = {
          type: 'tool-call',
          toolCallId: item.callId,
          toolName: item.name,
          input: parseArguments(item.arguments),
          providerOptions: {
            ...(item.providerData ?? {}),
          },
        };
        currentAssistantMessage.content.push(content);
      }
      continue;
    } else if (item.type === 'function_call_result') {
      if (currentAssistantMessage) {
        messages.push(currentAssistantMessage);
        currentAssistantMessage = undefined;
      }
      const toolResult: LanguageModelV2ToolResultPart = {
        type: 'tool-result',
        toolCallId: item.callId,
        toolName: item.name,
        output: convertToAiSdkOutput(item.output),
        providerOptions: {
          ...(item.providerData ?? {}),
        },
      };
      messages.push({
        role: 'tool',
        content: [toolResult],
        providerOptions: {
          ...(item.providerData ?? {}),
        },
      });
      continue;
    }

    if (item.type === 'hosted_tool_call') {
      throw new UserError('Hosted tool calls are not supported');
    }

    if (item.type === 'computer_call') {
      throw new UserError('Computer calls are not supported');
    }

    if (item.type === 'computer_call_result') {
      throw new UserError('Computer call results are not supported');
    }

    if (
      item.type === 'reasoning' &&
      item.content.length > 0 &&
      typeof item.content[0].text === 'string'
    ) {
      messages.push({
        role: 'assistant',
        content: [
          {
            type: 'reasoning',
            text: item.content[0].text,
            providerOptions: { ...(item.providerData ?? {}) },
          },
        ],
        providerOptions: {
          ...(item.providerData ?? {}),
        },
      });
      continue;
    }

    if (item.type === 'unknown') {
      messages.push({ ...(item.providerData ?? {}) } as LanguageModelV2Message);
      continue;
    }

    if (item) {
      throw new UserError(`Unknown item type: ${item.type}`);
    }

    const itemType = item satisfies never;
    throw new UserError(`Unknown item type: ${itemType}`);
  }

  if (currentAssistantMessage) {
    messages.push(currentAssistantMessage);
  }

  return messages;
}

/**
 * @internal
 * Converts a handoff to a language model V2 tool.
 *
 * @param model - The model to use.
 * @param handoff - The handoff to convert.
 */
function handoffToLanguageV2Tool(
  model: LanguageModelV2,
  handoff: SerializedHandoff,
): LanguageModelV2FunctionTool {
  return {
    type: 'function',
    name: handoff.toolName,
    description: handoff.toolDescription,
    inputSchema: handoff.inputJsonSchema as JSONSchema7,
  };
}

function convertToAiSdkOutput(
  output:
    | {
        type: 'text';
        text: string;
        providerData?: Record<string, any> | undefined;
      }
    | {
        type: 'image';
        data: string;
        mediaType: string;
        providerData?: Record<string, any> | undefined;
      },
): LanguageModelV2ToolResultPart['output'] {
  const anyOutput = output as any;
  if (anyOutput?.type === 'text' && typeof anyOutput.text === 'string') {
    return { type: 'text', value: anyOutput.text } as const;
  }
  if (
    anyOutput?.type === 'image' &&
    typeof anyOutput.data === 'string' &&
    typeof anyOutput.mediaType === 'string'
  ) {
    return {
      type: 'content',
      value: [
        {
          type: 'media',
          data: anyOutput.data,
          mediaType: anyOutput.mediaType,
        },
      ],
    };
  }
  throw new UserError(
    `Unsupported tool output type: ${String(anyOutput?.type)}`,
  );
}

/**
 * @internal
 * Converts a tool to a language model V2 tool.
 *
 * @param model - The model to use.
 * @param tool - The tool to convert.
 */
export function toolToLanguageV2Tool(
  model: LanguageModelV2,
  tool: SerializedTool,
): LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool {
  if (tool.type === 'function') {
    return {
      type: 'function',
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters as JSONSchema7,
    };
  }

  if (tool.type === 'hosted_tool') {
    return {
      type: 'provider-defined',
      id: `${model.provider}.${tool.name}`,
      name: tool.name,
      args: tool.providerData?.args ?? {},
    };
  }

  if (tool.type === 'computer') {
    return {
      type: 'provider-defined',
      id: `${model.provider}.${tool.name}`,
      name: tool.name,
      args: {
        environment: tool.environment,
        display_width: tool.dimensions[0],
        display_height: tool.dimensions[1],
      },
    };
  }

  const exhaustiveCheck: never = tool;
  throw new Error(`Unsupported tool type: ${JSON.stringify(exhaustiveCheck)}`);
}

/**
 * @internal
 * Converts an output type to a language model V2 response format.
 *
 * @param outputType - The output type to convert.
 * @returns The language model V2 response format.
 */
export function getResponseFormat(
  outputType: SerializedOutputType,
): LanguageModelV2CallOptions['responseFormat'] {
  if (outputType === 'text') {
    return {
      type: 'text',
    };
  }

  return {
    type: 'json',
    name: outputType.name,
    schema: outputType.schema,
  };
}

/**
 * Wraps a model from the AI SDK that adheres to the LanguageModelV2 spec to be used used as a model
 * in the OpenAI Agents SDK to use other models.
 *
 * While you can use this with the OpenAI models, it is recommended to use the default OpenAI model
 * provider instead.
 *
 * If tracing is enabled, the model will send generation spans to your traces processor.
 *
 * ```ts
 * import { aisdk } from '@openai/agents-extensions';
 * import { openai } from '@ai-sdk/openai';
 *
 * const model = aisdk(openai('gpt-4o'));
 *
 * const agent = new Agent({
 *   name: 'My Agent',
 *   model
 * });
 * ```
 *
 * @param model - The Vercel AI SDK model to wrap.
 * @returns The wrapped model.
 */
export class AiSdkModel implements Model {
  #model: LanguageModelV2;
  #logger = getLogger('openai-agents:extensions:ai-sdk');
  constructor(model: LanguageModelV2) {
    this.#model = model;
  }

  async getResponse(request: ModelRequest): Promise<ModelResponse> {
    throw new Error(`not implemented`);
  }

  async *getStreamedResponse(
    request: ModelRequest,
  ): AsyncIterable<ResponseStreamEvent> {
    const span = request.tracing ? createGenerationSpan() : undefined;
    try {
      if (span) {
        span.start();
        setCurrentSpan(span);
      }

      if (span?.spanData) {
        span.spanData.model = this.#model.provider + ':' + this.#model.modelId;
        span.spanData.model_config = {
          provider: this.#model.provider,
          model_impl: 'ai-sdk',
        };
      }

      let input: LanguageModelV2Prompt =
        typeof request.input === 'string'
          ? [
              {
                role: 'user',
                content: [{ type: 'text', text: request.input }],
              },
            ]
          : itemsToLanguageV2Messages(this.#model, request.input);

      if (request.systemInstructions) {
        input = [
          {
            role: 'system',
            content: request.systemInstructions,
          },
          ...input,
        ];
      }

      input = mergeConsecutiveSystemMessages(
        input,
        this.#model.provider,
        this.#model.modelId,
      );

      const tools = request.tools.map((tool) =>
        toolToLanguageV2Tool(this.#model, tool),
      );

      request.handoffs.forEach((handoff) => {
        tools.push(handoffToLanguageV2Tool(this.#model, handoff));
      });

      if (span && request.tracing === true) {
        span.spanData.input = input;
      }

      const responseFormat: LanguageModelV2CallOptions['responseFormat'] =
        getResponseFormat(request.outputType);

      const aiSdkRequest: LanguageModelV2CallOptions = {
        tools,
        prompt: input,
        temperature: request.modelSettings.temperature,
        topP: request.modelSettings.topP,
        frequencyPenalty: request.modelSettings.frequencyPenalty,
        presencePenalty: request.modelSettings.presencePenalty,
        maxOutputTokens: request.modelSettings.maxTokens,
        responseFormat,
        abortSignal: request.signal,
        ...(request.modelSettings.providerData ?? {}),
      };

      if (this.#logger.dontLogModelData) {
        this.#logger.debug('Request received (streamed)');
      } else {
        this.#logger.debug(
          'Request (streamed):',
          JSON.stringify(aiSdkRequest, null, 2),
        );
      }

      const { stream } = await this.#model.doStream(aiSdkRequest);

      let started = false;
      let responseId: string | undefined;
      let usagePromptTokens = 0;
      let usageCompletionTokens = 0;
      const functionCalls: Record<string, protocol.FunctionCallItem> = {};
      let textOutput: protocol.OutputText | undefined;

      for await (const part of stream) {
        if (!started) {
          started = true;
          yield { type: 'response_started' };
        }

        yield { type: 'model', event: part };

        switch (part.type) {
          case 'text-delta': {
            if (!textOutput) {
              textOutput = { type: 'output_text', text: '' };
            }
            textOutput.text += (part as any).delta;
            yield { type: 'output_text_delta', delta: (part as any).delta };
            break;
          }
          case 'tool-call': {
            const toolCallId = (part as any).toolCallId;
            if (toolCallId) {
              functionCalls[toolCallId] = {
                type: 'function_call',
                callId: toolCallId,
                name: (part as any).toolName,
                arguments: (part as any).input ?? '',
                status: 'completed',
              };
            }
            break;
          }
          case 'response-metadata': {
            if ((part as any).id) {
              responseId = (part as any).id;
            }
            break;
          }
          case 'finish': {
            usagePromptTokens = Number.isNaN((part as any).usage?.inputTokens)
              ? 0
              : ((part as any).usage?.inputTokens ?? 0);
            usageCompletionTokens = Number.isNaN(
              (part as any).usage?.outputTokens,
            )
              ? 0
              : ((part as any).usage?.outputTokens ?? 0);
            break;
          }
          case 'error': {
            throw part.error;
          }
          default:
            break;
        }
      }

      const outputs: protocol.OutputModelItem[] = [];
      if (textOutput) {
        outputs.push({
          type: 'message',
          role: 'assistant',
          content: [textOutput],
          status: 'completed',
        });
      }
      for (const fc of Object.values(functionCalls)) {
        outputs.push(fc);
      }

      const finalEvent: protocol.StreamEventResponseCompleted = {
        type: 'response_done',
        response: {
          id: responseId ?? 'FAKE_ID',
          usage: {
            inputTokens: usagePromptTokens,
            outputTokens: usageCompletionTokens,
            totalTokens: usagePromptTokens + usageCompletionTokens,
          },
          output: outputs,
        },
      };

      if (span && request.tracing === true) {
        span.spanData.output = outputs;
        span.spanData.usage = {
          // Note that tracing supports only input and output tokens for Chat Completions.
          // So, we don't include other properties here.
          input_tokens: finalEvent.response.usage.inputTokens,
          output_tokens: finalEvent.response.usage.outputTokens,
        };
      }

      if (this.#logger.dontLogModelData) {
        this.#logger.debug('Response ready (streamed)');
      } else {
        this.#logger.debug(
          'Response (streamed):',
          JSON.stringify(finalEvent.response, null, 2),
        );
      }

      yield finalEvent;
    } catch (error) {
      if (span) {
        span.setError({
          message: 'Error streaming response',
          data: {
            error:
              request.tracing === true
                ? String(error)
                : error instanceof Error
                  ? error.name
                  : undefined,
          },
        });
      }
      throw error;
    } finally {
      if (span) {
        span.end();
        resetCurrentSpan();
      }
    }
  }
}

/**
 * Wraps a model from the AI SDK that adheres to the LanguageModelV2 spec to be used used as a model
 * in the OpenAI Agents SDK to use other models.
 *
 * While you can use this with the OpenAI models, it is recommended to use the default OpenAI model
 * provider instead.
 *
 * If tracing is enabled, the model will send generation spans to your traces processor.
 *
 * ```ts
 * import { aisdk } from '@openai/agents-extensions';
 * import { openai } from '@ai-sdk/openai';
 *
 * const model = aisdk(openai('gpt-4o'));
 *
 * const agent = new Agent({
 *   name: 'My Agent',
 *   model
 * });
 * ```
 *
 * @param model - The Vercel AI SDK model to wrap.
 * @returns The wrapped model.
 */
export function aisdk(model: LanguageModelV2) {
  return new AiSdkModel(model);
}

export function parseArguments(args: string | undefined | null): any {
  if (!args) {
    return {};
  }

  try {
    return JSON.parse(args);
  } catch (_) {
    return {};
  }
}

export function toolChoiceToLanguageV2Format(
  toolChoice: ModelSettingsToolChoice | undefined,
): LanguageModelV2ToolChoice | undefined {
  if (!toolChoice) {
    return undefined;
  }
  switch (toolChoice) {
    case 'auto':
      return { type: 'auto' };
    case 'required':
      return { type: 'required' };
    case 'none':
      return { type: 'none' };
    default:
      return { type: 'tool', toolName: toolChoice };
  }
}
