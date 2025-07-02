import type { UIMessage as BaseUIMessage } from '@ai-sdk/ui-utils';
import { useEffect, useRef } from 'react';
import { toolApprovalActions } from '@/state/toolApproval';
import type { UIMessageAnnotation } from '@/types/message';
import { UIMessageType } from '@/types/message';

interface MessageProcessorProps {
  messages: BaseUIMessage[];
}

export default function MessageProcessor({ messages }: MessageProcessorProps) {
  const processedMessagesRef = useRef(new Set<string>());

  useEffect(() => {
    if (!messages || messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const messageId = `${lastMessage.id || 'unknown'}-${lastMessage.annotations?.length || 0}`;

    if (processedMessagesRef.current.has(messageId)) {
      return;
    }

    processedMessagesRef.current.add(messageId);

    if (lastMessage.annotations && Array.isArray(lastMessage.annotations)) {
      lastMessage.annotations.forEach((annotation: any) => {
        if (isToolApprovalAnnotation(annotation)) {
          processToolApprovalMessage(annotation as UIMessageAnnotation);
        }
      });
    }

    if (processedMessagesRef.current.size > 100) {
      const oldEntries = Array.from(processedMessagesRef.current).slice(0, 50);
      oldEntries.forEach((entry) => {
        processedMessagesRef.current.delete(entry);
      });
    }
  }, [messages]);

  return null;
}

function isToolApprovalAnnotation(annotation: any): boolean {
  return (
    annotation &&
    typeof annotation === 'object' &&
    (annotation.type === UIMessageType.ToolApprovalRequest ||
      annotation.type === UIMessageType.ToolApprovalResult ||
      annotation.type === UIMessageType.ToolApprovalError)
  );
}

function processToolApprovalMessage(annotation: UIMessageAnnotation): void {
  switch (annotation.type) {
    case UIMessageType.ToolApprovalRequest:
      toolApprovalActions.handleApprovalRequest(annotation);
      break;

    case UIMessageType.ToolApprovalResult:
      toolApprovalActions.handleApprovalResult(annotation);
      break;

    case UIMessageType.ToolApprovalError:
      toolApprovalActions.handleApprovalError(annotation);
      break;

    default:
      break;
  }
}
