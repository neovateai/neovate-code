import type { UIMessage as BaseUIMessage } from '@ai-sdk/ui-utils';
import { useEffect, useRef } from 'react';
import { toolApprovalActions } from '@/state/toolApproval';
import type { UIMessageAnnotation } from '@/types/message';
import { UIMessageType } from '@/types/message';

interface MessageProcessorProps {
  messages: BaseUIMessage[];
}

/**
 * 消息处理器 - 统一处理消息的副作用
 * 负责监听消息变化并触发相应的状态更新
 */
export default function MessageProcessor({ messages }: MessageProcessorProps) {
  const processedMessagesRef = useRef(new Set<string>());

  useEffect(() => {
    if (!messages || messages.length === 0) {
      return;
    }

    // 只处理新的消息，避免重复处理
    const lastMessage = messages[messages.length - 1];
    const messageId = `${lastMessage.id || 'unknown'}-${lastMessage.annotations?.length || 0}`;

    if (processedMessagesRef.current.has(messageId)) {
      return;
    }

    // 标记消息为已处理
    processedMessagesRef.current.add(messageId);

    // 处理消息中的工具审批相关注释
    if (lastMessage.annotations && Array.isArray(lastMessage.annotations)) {
      lastMessage.annotations.forEach((annotation: any) => {
        if (isToolApprovalAnnotation(annotation)) {
          processToolApprovalMessage(annotation as UIMessageAnnotation);
        }
      });
    }

    // 清理旧的处理记录，避免内存泄漏
    if (processedMessagesRef.current.size > 100) {
      const oldEntries = Array.from(processedMessagesRef.current).slice(0, 50);
      oldEntries.forEach((entry) => {
        processedMessagesRef.current.delete(entry);
      });
    }
  }, [messages]);

  return null;
}

/**
 * 检查是否为工具审批相关的注释
 */
function isToolApprovalAnnotation(annotation: any): boolean {
  return (
    annotation &&
    typeof annotation === 'object' &&
    (annotation.type === UIMessageType.ToolApprovalRequest ||
      annotation.type === UIMessageType.ToolApprovalResult ||
      annotation.type === UIMessageType.ToolApprovalError)
  );
}

/**
 * 处理工具审批相关消息
 */
function processToolApprovalMessage(annotation: UIMessageAnnotation): void {
  switch (annotation.type) {
    case UIMessageType.ToolApprovalRequest:
      console.log('处理工具审批请求消息:', annotation);
      toolApprovalActions.handleApprovalRequest(annotation);
      break;

    case UIMessageType.ToolApprovalResult:
      console.log('处理工具审批结果消息:', annotation);
      toolApprovalActions.handleApprovalResult(annotation);
      break;

    case UIMessageType.ToolApprovalError:
      console.log('处理工具审批错误消息:', annotation);
      toolApprovalActions.handleApprovalError(annotation);
      break;

    default:
      // 忽略其他类型的消息
      break;
  }
}
