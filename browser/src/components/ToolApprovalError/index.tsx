import {
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Alert, Card, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ToolApprovalErrorMessage } from '@/types/message';

const { Text } = Typography;

interface ToolApprovalErrorProps {
  message: ToolApprovalErrorMessage;
}

export default function ToolApprovalError({ message }: ToolApprovalErrorProps) {
  const { t } = useTranslation();

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card
      size="small"
      style={{
        border: '1px solid #ff4d4f',
        backgroundColor: '#fff2f0',
        borderRadius: 8,
        margin: '8px 0',
      }}
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          <span>{t('toolApproval.error', '工具审批错误')}</span>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>{t('toolApproval.toolName', '工具名称')}: </Text>
          <Text code>{message.toolName}</Text>
        </div>

        <Alert
          message={t('toolApproval.errorMessage', '错误信息')}
          description={message.error}
          type="error"
          showIcon
          style={{ marginBottom: 8 }}
        />

        <div>
          <Text type="secondary">
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {formatTime(message.timestamp)}
          </Text>
        </div>
      </Space>
    </Card>
  );
}
