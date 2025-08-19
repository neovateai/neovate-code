import { memo, useMemo } from 'react';
import { useStableValue } from '@/hooks/useStableValue';
import type { UIMessage, UIMessageAnnotation } from '@/types/message';
import { UIMessageType } from '@/types/message';
import { mergeMessages } from '@/utils/mergeMessages';
import MarkdownRenderer from '../MarkdownRenderer';
import ToolApprovalConfirmation from '../ToolApprovalConfirmation';
import ToolApprovalError from '../ToolApprovalError';
import ToolApprovalResult from '../ToolApprovalResult';
import './index.less';
import AssistantTextMessage from './v1/AssistantTextMessage';
import AssistantThinkingMessage from './v1/AssistantThinkingMessage';
import AssistantToolMessage from './v1/AssistantToolMessage';

const clsPrefix = 'assistant-message';

interface MessageProps {
  message: UIMessage;
}

interface MessagePartProps {
  part: UIMessageAnnotation;
  index: number;
}

const MessagePart: React.FC<MessagePartProps> = memo(({ part, index }) => {
  switch (part.type) {
    case UIMessageType.Text:
      return <AssistantTextMessage key={index} message={part} />;
    case UIMessageType.Reasoning:
      return <AssistantThinkingMessage key={index} message={part} />;
    case UIMessageType.Tool:
      return <AssistantToolMessage key={index} message={part} />;
    case UIMessageType.ToolApprovalRequest:
      return <ToolApprovalConfirmation key={index} message={part} />;
    case UIMessageType.ToolApprovalResult:
      return <ToolApprovalResult key={index} message={part} />;
    case UIMessageType.ToolApprovalError:
      return <ToolApprovalError key={index} message={part} />;
    default:
      return (
        <div key={index}>
          <MarkdownRenderer
            content={`Unsupported message type: ${part.type}`}
          />
        </div>
      );
  }
});

MessagePart.displayName = 'MessagePart';

const AssistantMessage: React.FC<MessageProps> = ({ message }) => {
  const mergedMessages = useMemo(() => {
    return mergeMessages(message.annotations);
  }, [message.annotations]);

  const messageParts = useStableValue(mergedMessages);

  if (!messageParts || messageParts.length === 0) {
    return null;
  }

  return (
    <div className={clsPrefix}>
      {messageParts.map((part, index) => (
        <MessagePart key={`${part.type}-${index}`} part={part} index={index} />
      ))}
    </div>
  );
};

export default memo(AssistantMessage);
