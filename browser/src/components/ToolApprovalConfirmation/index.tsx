import {
  CheckOutlined,
  CloseOutlined,
  DoubleRightOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Spin, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { toolApprovalActions, toolApprovalState } from '@/state/toolApproval';
import type { ToolApprovalRequestMessage } from '@/types/message';
import MessageWrapper from '../MessageWrapper';

interface ToolApprovalConfirmationProps {
  message: ToolApprovalRequestMessage;
}

export default function ToolApprovalConfirmation({
  message,
}: ToolApprovalConfirmationProps) {
  const { t } = useTranslation();
  const snap = useSnapshot(toolApprovalState);

  // 检查当前消息是否为当前待处理的请求
  if (
    !snap.currentRequest ||
    snap.currentRequest.toolCallId !== message.toolCallId
  ) {
    return null;
  }

  // 格式化工具参数描述
  const getToolDescription = (
    toolName: string,
    params: Record<string, any>,
  ) => {
    switch (toolName) {
      case 'read':
        return t('toolApproval.toolDescriptions.read', {
          filePath: params.file_path,
        });
      case 'bash':
        return t('toolApproval.toolDescriptions.bash', {
          command: params.command,
        });
      case 'edit':
        return t('toolApproval.toolDescriptions.edit', {
          filePath: params.file_path,
        });
      case 'write':
        return t('toolApproval.toolDescriptions.write', {
          filePath: params.file_path,
        });
      case 'fetch':
        return t('toolApproval.toolDescriptions.fetch', { url: params.url });
      case 'glob':
        return t('toolApproval.toolDescriptions.glob', {
          pattern: params.pattern,
        });
      case 'grep':
        return t('toolApproval.toolDescriptions.grep', {
          pattern: params.pattern,
        });
      case 'ls':
        return t('toolApproval.toolDescriptions.ls', {
          dirPath: params.dir_path,
        });
      default:
        return t('toolApproval.toolDescriptions.default', { toolName });
    }
  };

  const onApprove = (option: 'once' | 'always' | 'always_tool') => {
    toolApprovalActions.approveToolUse(true, option);
  };

  const onDeny = () => {
    toolApprovalActions.approveToolUse(false);
  };

  const isSubmitting = snap.submitting;

  const iconWrapper = (icon: React.ReactNode, tooltip: string) => {
    return (
      <Tooltip title={tooltip}>
        <Spin spinning={isSubmitting}>{icon}</Spin>
      </Tooltip>
    );
  };

  return (
    <MessageWrapper
      title={getToolDescription(message.toolName, message.args)}
      expandable={false}
      showExpandIcon={false}
      defaultExpanded={false}
      actions={[
        {
          key: 'always',
          icon: iconWrapper(
            <DoubleRightOutlined />,
            t('toolApproval.approveAlways', '允许此命令'),
          ),
          onClick: () => onApprove('always'),
        },
        {
          key: 'always_tool',
          icon: iconWrapper(
            <ToolOutlined />,
            t('toolApproval.approveAlwaysTool', `允许 ${message.toolName}`, {
              toolName: message.toolName,
            }),
          ),
          onClick: () => onApprove('always_tool'),
        },
        {
          key: 'once',
          icon: iconWrapper(
            <CheckOutlined />,
            t('toolApproval.approveOnce', '允许一次'),
          ),
          onClick: () => onApprove('once'),
        },
        {
          key: 'deny',
          icon: iconWrapper(<CloseOutlined />, t('toolApproval.deny', '拒绝')),
          onClick: onDeny,
        },
      ]}
    />
  );
}
