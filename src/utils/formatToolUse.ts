import { AgentInputItem } from '@openai/agents';
import { isArray, isPlainObject } from 'lodash-es';

interface ToolUse {
  name: string;
  params: Record<string, any>;
  result: Record<string, any>;
  callId: string;
}

interface ImageData {
  type: 'image';
  data: string;
  mimeType: string;
}

const isImageData = (data: any): data is ImageData =>
  isPlainObject(data) && data.type === 'image';

const isUrl = (data: string): boolean =>
  data.startsWith('http://') || data.startsWith('https://');

export function parseImageData(data: string, mimeType: string): string {
  return isUrl(data) ? data : `data:${mimeType};base64,${data}`;
}

export function createStableToolKey(
  toolName: string,
  params: Record<string, any>,
): string {
  // sort parameter keys to ensure stable string serialization
  const sortedParams = Object.keys(params)
    .sort()
    .reduce(
      (result, key) => {
        result[key] = params[key];
        return result;
      },
      {} as Record<string, any>,
    );

  return `${toolName}:${JSON.stringify(sortedParams)}`;
}

function createImageInputItem(data: string, mimeType: string): AgentInputItem {
  return {
    role: 'user',
    type: 'message',
    content: [
      {
        type: 'input_image',
        image: parseImageData(data, mimeType),
        providerData: { mimeType },
      },
    ],
  };
}

function createAssistantToolFormatItem(
  name: string,
  result: Record<string, any>,
  callId: string,
): AgentInputItem {
  return {
    role: 'assistant',
    type: 'message',
    content: [
      {
        type: 'output_text',
        text: JSON.stringify({
          type: 'function_call_result',
          name,
          result,
          callId,
        }),
      },
    ],
    status: 'completed',
  };
}

function createMultipleImagesInputItem(
  name: string,
  params: Record<string, any>,
  result: any[],
): AgentInputItem {
  return {
    role: 'user',
    type: 'message',
    content: result.map((item) => {
      if (item.type === 'image') {
        return {
          type: 'input_image',
          image: parseImageData(item.data, item.mimeType),
          providerData: { mimeType: item.mimeType },
        };
      }
      return {
        type: 'input_text',
        text: `[${name}${params ? ` for ${JSON.stringify(params)}` : ''}] result: \n<function_results>\n${JSON.stringify(
          item,
        )}\n</function_results>`,
      };
    }),
  };
}

function createDefaultInputItem(
  name: string,
  params: Record<string, any>,
  result: Record<string, any>,
): AgentInputItem {
  return {
    role: 'user',
    type: 'message',
    content: `[${name} for ${JSON.stringify(params)}] result: \n<function_results>\n${JSON.stringify(
      result,
    )}\n</function_results>`,
  };
}

export function formatToolUse(toolUse: ToolUse): AgentInputItem {
  const { name, params, result, callId } = toolUse;

  // Use simplified format if environment variable is set
  if (process.env.USE_ASSISTANT_TOOL_FORMAT === '1') {
    return createAssistantToolFormatItem(name, result, callId);
  }

  // Handle image results from read tool
  if (name === 'read' && result.success && result.type === 'image') {
    return createImageInputItem(result.data, result.mimeType);
  }

  // Handle direct image results
  if (isImageData(result)) {
    return createImageInputItem(result.data, result.mimeType);
  }

  // Handle array of results that may contain images
  if (isArray(result) && result.some(isImageData)) {
    return createMultipleImagesInputItem(name, params, result);
  }

  // Default case for text results
  return createDefaultInputItem(name, params, result);
}
