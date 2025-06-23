import type {
  TextMessage,
  ToolMessage,
  UIMessageAnnotation,
} from '@/types/message';
import { UIMessageType } from '@/types/message';

export function mergeMessages(
  messages: UIMessageAnnotation[],
): UIMessageAnnotation[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  const merged: UIMessageAnnotation[] = [];
  let textAccumulator = '';

  const isTextMessage = (msg: UIMessageAnnotation): msg is TextMessage =>
    msg.type === UIMessageType.Text;

  const isToolMessage = (msg: UIMessageAnnotation): msg is ToolMessage =>
    msg.type === UIMessageType.Tool;

  const findMatchingToolCall = (
    toolCallId: string,
    fromIndex: number,
  ): number => {
    for (let i = fromIndex - 1; i >= 0; i--) {
      const msg = merged[i];
      if (
        isToolMessage(msg) &&
        msg.toolCallId === toolCallId &&
        msg.state === 'call'
      ) {
        return i;
      }
    }
    return -1;
  };

  const finalizeTextAccumulator = (): void => {
    const lastMessage = merged[merged.length - 1];
    if (
      lastMessage &&
      isTextMessage(lastMessage) &&
      lastMessage.state === UIMessageType.TextDelta
    ) {
      lastMessage.state = UIMessageType.Text;
    }
    textAccumulator = '';
  };

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    if (
      message.type !== UIMessageType.TextDelta &&
      message.type !== UIMessageType.Text
    ) {
      finalizeTextAccumulator();
    }

    switch (message.type) {
      case UIMessageType.TextDelta: {
        textAccumulator += message.text;
        const lastMessage = merged[merged.length - 1];

        if (
          lastMessage &&
          isTextMessage(lastMessage) &&
          lastMessage.state === UIMessageType.TextDelta
        ) {
          lastMessage.text = textAccumulator;
        } else {
          merged.push({
            type: UIMessageType.Text,
            text: textAccumulator,
            state: UIMessageType.TextDelta,
          });
        }
        break;
      }

      case UIMessageType.Text: {
        const lastMessage = merged[merged.length - 1];

        if (
          lastMessage &&
          isTextMessage(lastMessage) &&
          lastMessage.state === UIMessageType.TextDelta
        ) {
          lastMessage.text = message.text;
          lastMessage.state = UIMessageType.Text;
        } else {
          merged.push({
            ...message,
            state: UIMessageType.Text,
          });
        }
        textAccumulator = '';
        break;
      }

      case UIMessageType.Reasoning:
        merged.push(message);
        break;

      case UIMessageType.ToolCall:
        merged.push({
          ...message,
          type: UIMessageType.Tool,
          state: 'call' as const,
          step: 0,
        });
        break;

      case UIMessageType.ToolCallResult: {
        const matchingCallIndex = findMatchingToolCall(
          message.toolCallId,
          merged.length,
        );

        if (matchingCallIndex !== -1) {
          const toolCallMessage = merged[matchingCallIndex] as ToolMessage;
          toolCallMessage.state = 'result';
          toolCallMessage.step = 1;
          toolCallMessage.result = message.result;
        } else {
          merged.push({
            type: UIMessageType.Tool,
            toolCallId: message.toolCallId,
            toolName: message.toolName,
            args: message.args,
            result: message.result,
            state: 'result' as const,
            step: 1,
          });
        }
        break;
      }

      default:
        merged.push(message);
        console.warn(`Unhandled message type: ${message.type}`);
        break;
    }
  }

  finalizeTextAccumulator();

  return merged;
}
