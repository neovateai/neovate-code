import createDebug from 'debug';
import { jsonrepair } from 'jsonrepair';

const debug = createDebug('neovate:utils:parse-message');

interface TextContent {
  type: 'text';
  content: string;
  partial: boolean;
}

interface ToolUse {
  type: 'tool_use';
  name: string;
  params: Partial<Record<string, string>>;
  callId?: string;
  partial: boolean;
}

export type MessageContent = TextContent | ToolUse;

export function parseMessage(text: string): MessageContent[] {
  const contentBlocks: MessageContent[] = [];

  // --- 状态变量 ---
  let currentTextContentStart = 0; // 当前文本块的起始索引
  let currentTextContent: TextContent | undefined;

  let currentToolUse: ToolUse | undefined; // 当前正在解析的工具使用对象
  // 当前正在解析的参数标签名 ('tool_name', 'arguments' 或 'argument')
  let currentParamName: 'tool_name' | 'arguments' | 'argument' | undefined;
  let currentParamValueStart = 0; // 当前参数值的起始索引

  // --- 标签常量 ---
  const TOOL_USE_OPEN = '<use_tool>';
  const TOOL_USE_CLOSE = '</use_tool>';
  const TOOL_NAME_OPEN = '<tool_name>';
  const TOOL_NAME_CLOSE = '</tool_name>';
  const ARGUMENTS_OPEN = '<arguments>';
  const ARGUMENTS_CLOSE = '</arguments>';
  const ARGUMENT_OPEN = '<argument>';
  const ARGUMENT_CLOSE = '</argument>';

  const len = text.length;
  for (let i = 0; i < len; i++) {
    // --- 状态1: 正在解析工具的参数内部 (e.g., 在 <tool_name>...</tool_name> 之间) ---
    if (currentToolUse && currentParamName) {
      const closeTag =
        currentParamName === 'tool_name'
          ? TOOL_NAME_CLOSE
          : currentParamName === 'arguments'
            ? ARGUMENTS_CLOSE
            : ARGUMENT_CLOSE;
      // 检查当前位置是否是参数的闭合标签
      if (
        i >= closeTag.length - 1 &&
        text.startsWith(closeTag, i - closeTag.length + 1)
      ) {
        // 提取参数值
        const value = text.slice(
          currentParamValueStart,
          i - closeTag.length + 1,
        );

        if (currentParamName === 'tool_name') {
          currentToolUse.name = value.trim();
        } else if (
          currentParamName === 'arguments' ||
          currentParamName === 'argument'
        ) {
          let jsonString = value.trim();
          try {
            // 尝试解析JSON字符串
            // 如果jsonString为空，解析会失败，所以我们给一个默认的空对象
            currentToolUse.params = jsonString ? JSON.parse(jsonString) : {};
          } catch (e) {
            try {
              // 仅移除最后一个 }\\n 导致的 json 解析失败，避免修改 json 内部的换行符
              if (jsonString.endsWith('}\\n')) {
                jsonString = jsonString.replace(/}\\n$/, '}');
              }
              // 尝试用 jsonrepair 修复
              const repairedJsonString = jsonrepair(jsonString);
              currentToolUse.params = JSON.parse(repairedJsonString);
            } catch (e) {
              debug('jsonrepair failed', e);
              // 如果JSON格式错误或不完整（流式场景），则优雅地处理
              currentToolUse.params = {
                _error: 'Invalid or incomplete JSON',
                _raw: jsonString,
              };
            }
          }
        }
        // 重置参数状态，返回到“工具内部但不在参数内”的状态
        currentParamName = undefined;
      } else {
        // 如果不是闭合标签，继续向后查找
        continue;
      }
    }

    // --- 状态2: 正在工具内部，但不在具体参数内 ---
    if (currentToolUse && !currentParamName) {
      // 检查是否是 <tool_name> 的开始
      if (
        i >= TOOL_NAME_OPEN.length - 1 &&
        text.startsWith(TOOL_NAME_OPEN, i - TOOL_NAME_OPEN.length + 1)
      ) {
        currentParamName = 'tool_name';
        currentParamValueStart = i + 1; // 参数值在标签之后开始
        continue;
      }
      // 检查是否是 <arguments> 的开始
      if (
        i >= ARGUMENTS_OPEN.length - 1 &&
        text.startsWith(ARGUMENTS_OPEN, i - ARGUMENTS_OPEN.length + 1)
      ) {
        currentParamName = 'arguments';
        currentParamValueStart = i + 1;
        continue;
      }
      // 检查是否是 <argument> 的开始
      if (
        i >= ARGUMENT_OPEN.length - 1 &&
        text.startsWith(ARGUMENT_OPEN, i - ARGUMENT_OPEN.length + 1)
      ) {
        currentParamName = 'argument';
        currentParamValueStart = i + 1;
        continue;
      }
      // 检查是否是 </use_tool> 的结束
      if (
        i >= TOOL_USE_CLOSE.length - 1 &&
        text.startsWith(TOOL_USE_CLOSE, i - TOOL_USE_CLOSE.length + 1)
      ) {
        currentToolUse.partial = false; // 标记为完整
        contentBlocks.push(currentToolUse);
        currentToolUse = undefined; // 重置工具状态
        currentTextContentStart = i + 1; // 新的文本块从这里之后开始
        continue;
      }
      // 如果在工具内部，但不是任何已知标签，则忽略这些字符
      continue;
    }

    // --- 状态3: 正在解析普通文本，或寻找工具的开始 ---
    if (!currentToolUse) {
      // 检查是否是 <use_tool> 的开始
      if (
        i >= TOOL_USE_OPEN.length - 1 &&
        text.startsWith(TOOL_USE_OPEN, i - TOOL_USE_OPEN.length + 1)
      ) {
        // 结束当前的文本块
        const content = text
          .slice(currentTextContentStart, i - TOOL_USE_OPEN.length + 1)
          .trim();
        if (content.length > 0) {
          contentBlocks.push({
            type: 'text',
            content: content,
            partial: false, // 因为遇到了工具标签，所以这个文本块是完整的
          });
        }
        currentTextContent = undefined;

        // 开始一个新的工具使用块
        currentToolUse = {
          type: 'tool_use',
          name: '',
          params: {},
          partial: true, // 默认为部分，直到遇到闭合标签
        };
        continue;
      }

      // 如果不是工具的开始，那么就是普通文本
      if (!currentTextContent) {
        // 如果还没有文本块，就创建一个新的
        currentTextContent = {
          type: 'text',
          content: '', // 内容稍后填充
          partial: true,
        };
        // 文本的起始点已经在 currentTextContentStart 中记录
      }
    }
  } // 循环结束

  // --- 循环后处理 (处理流式场景下的不完整块) ---

  // 如果字符串在工具使用块内部结束
  if (currentToolUse) {
    // 如果在参数值内部结束
    if (currentParamName) {
      const value = text.slice(currentParamValueStart); // 从参数开始一直到字符串末尾
      if (currentParamName === 'tool_name') {
        currentToolUse.name = value.trim();
      } else if (
        currentParamName === 'arguments' ||
        currentParamName === 'argument'
      ) {
        let jsonString = value.trim();
        // 处理 arguments 未闭合的情况
        if (jsonString.endsWith('</use_tool>')) {
          jsonString = jsonString.replace(/<\/use_tool>$/, '');
        }
        try {
          // 再次尝试解析，很可能会失败，但以防万一是个完整的JSON
          currentToolUse.params = jsonString ? JSON.parse(jsonString) : {};
        } catch (e) {
          try {
            // 尝试使用 jsonrepair 修复
            const repairedJsonString = jsonrepair(jsonString);
            currentToolUse.params = JSON.parse(repairedJsonString);
          } catch (e) {
            debug('currentParamName jsonrepair failed', e);
            // 如果修复失败，则返回错误
            currentToolUse.params = {
              _error: 'Incomplete JSON',
              _raw: jsonString,
            };
          }
        }
      }
    }
    // 整个工具块是不完整的，推入结果数组
    contentBlocks.push(currentToolUse);
  }
  // 如果字符串在普通文本中结束
  else if (currentTextContent) {
    const content = text.slice(currentTextContentStart).trim();
    if (content.length > 0) {
      currentTextContent.content = content;
      // 因为流未结束，所以它仍然是部分的
      currentTextContent.partial = true;
      contentBlocks.push(currentTextContent);
    }
  }

  return contentBlocks;
}
