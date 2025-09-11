import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Space } from 'antd';
import type { ToolApprovalResultMessage } from '@/types/message';
import MessageWrapper from '../MessageWrapper';

interface ToolApprovalResultProps {
  message: ToolApprovalResultMessage;
}

export default function ToolApprovalResult({
  message,
}: ToolApprovalResultProps) {
  if (message.toolName === 'edit' || message.toolName === 'write') {
    return null;
  }

  return (
    <MessageWrapper
      title={
        <Space>
          {message.approved ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
          )}
          <span>{message.toolName}</span>
        </Space>
      }
      expandable={false}
      defaultExpanded={false}
      showExpandIcon={false}
    />
  );
}
