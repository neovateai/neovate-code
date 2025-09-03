import {
  CheckOutlined,
  CloseOutlined,
  DoubleRightOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Spin, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import BashIcon from '@/icons/bash.svg?react';
import EditIcon from '@/icons/edit.svg?react';
import SearchIcon from '@/icons/search.svg?react';
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

  // 格式化工具参数描述，实际上只有fetch，bash，edit会有审批
  const getToolDescription = (
    toolName: string,
    params: Record<string, any>,
  ) => {
    switch (toolName) {
      case 'read':
        return params.file_path;
      case 'bash':
        return (
          <div className="flex items-center gap-2">
            <BashIcon />
            {params.command}
          </div>
        );
      case 'edit':
        return (
          <div className="flex items-center gap-2">
            <EditIcon />
            {params.file_path}
          </div>
        );
      case 'write':
        return (
          <div className="flex items-center gap-2">
            <EditIcon />
            {params.file_path}
          </div>
        );
      case 'fetch':
        return (
          <div className="flex items-center gap-2">
            <SearchIcon />
            {params.url}
          </div>
        );
      case 'glob':
        return params.pattern;
      case 'grep':
        return params.pattern;
      case 'ls':
        return params.dir_path;
      default:
        return toolName;
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
