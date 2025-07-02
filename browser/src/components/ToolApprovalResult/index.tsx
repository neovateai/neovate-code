import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Card, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ToolApprovalResultMessage } from '@/types/message';

const { Text } = Typography;

interface ToolApprovalResultProps {
  message: ToolApprovalResultMessage;
}

export default function ToolApprovalResult({
  message,
}: ToolApprovalResultProps) {
  const { t } = useTranslation();

  const getApprovalOptionText = (option?: string) => {
    switch (option) {
      case 'once':
        return t('toolApproval.approveOnce', '允许（一次）');
      case 'always':
        return t('toolApproval.approveAlways', '允许（此命令总是）');
      case 'always_tool':
        return t(
          'toolApproval.approveAlwaysTool',
          `允许（${message.toolName} 总是）`,
        );
      default:
        return '';
    }
  };

  return (
    <Card
      size="small"
      style={{
        border: message.approved ? '1px solid #52c41a' : '1px solid #ff4d4f',
        backgroundColor: message.approved ? '#f6ffed' : '#fff2f0',
        borderRadius: 8,
        margin: '8px 0',
      }}
      title={
        <Space>
          {message.approved ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
          )}
          <span>
            {message.approved
              ? t('toolApproval.approved', '工具执行已批准')
              : t('toolApproval.denied', '工具执行已拒绝')}
          </span>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>{t('toolApproval.toolName', '工具名称')}: </Text>
          <Text code>{message.toolName}</Text>
        </div>

        {message.approved && message.option && (
          <div>
            <Text strong>{t('toolApproval.approvalOption', '批准选项')}: </Text>
            <Tag color="green">{getApprovalOptionText(message.option)}</Tag>
          </div>
        )}
      </Space>
    </Card>
  );
}
