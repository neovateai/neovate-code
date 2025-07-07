import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
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
  const { approved, toolName } = message;

  const baseClasses = 'mx-0 rounded-lg p-2 text-sm my-4';
  const approvedClasses = 'border border-green-200 bg-green-50 text-green-700';
  const deniedClasses = 'border border-red-200 bg-red-50 text-red-700';

  const statusText = approved
    ? t('toolApproval.approved', 'Tool execution approved')
    : t('toolApproval.denied', 'Tool execution denied');

  return (
    <div
      className={`${baseClasses} ${approved ? approvedClasses : deniedClasses}`}
    >
      <Flex align="center" gap="small">
        {approved ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        <span className="font-mono bg-black/5 px-1.5 py-0.5 rounded">
          {toolName}
        </span>
        <Text className="text-current">{statusText}</Text>
      </Flex>
    </div>
  );
}
