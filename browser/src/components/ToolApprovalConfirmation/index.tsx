import { CloseOutlined, RedoOutlined } from '@ant-design/icons';
import { Button, Spin, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import AlwaysCommandIcon from '@/icons/alwaysCommand.svg?react';
import AlwaysToolIcon from '@/icons/alwaysTool.svg?react';
import ApproveOnceIcon from '@/icons/approveOnce.svg?react';
import ApproveToolIcon from '@/icons/approveTool.svg?react';
import BashIcon from '@/icons/bash.svg?react';
import EditIcon from '@/icons/edit.svg?react';
import RejectOnceIcon from '@/icons/rejectOnce.svg?react';
import SearchIcon from '@/icons/search.svg?react';
import { toolApprovalActions, toolApprovalState } from '@/state/toolApproval';
import type { ToolApprovalRequestMessage } from '@/types/message';
import MessageWrapper from '../MessageWrapper';
import styles from './index.module.css';

const prefixCls = 'tool-approval-confirmation';

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

  const onRetry = () => {
    toolApprovalActions.retrySubmit();
  };

  const isSubmitting = snap.submitting;
  const hasError = !!snap.submitError;

  const iconWrapper = (icon: React.ReactNode, tooltip: string) => {
    return (
      <Tooltip title={tooltip}>
        <Spin spinning={isSubmitting}>{icon}</Spin>
      </Tooltip>
    );
  };

  if (hasError) {
    return (
      <MessageWrapper
        title={
          <div className="flex items-center gap-2">
            <CloseOutlined style={{ color: '#ff4d4f' }} />
            <span>{t('toolApproval.submitFailed')}</span>
          </div>
        }
        actions={[
          {
            key: 'retry',
            icon: iconWrapper(
              <RedoOutlined />,
              t('toolApproval.retry', '重试'),
            ),
            onClick: onRetry,
          },
        ]}
      >
        <div className="text-sm text-gray-500">{snap.submitError}</div>
      </MessageWrapper>
    );
  }

  return (
    <div className={styles.container}>
      <MessageWrapper
        title={getToolDescription(message.toolName, message.args)}
        expandable={false}
        showExpandIcon={false}
        defaultExpanded={false}
      />
      <div className={styles.actions}>
        <Button
          className={styles.actionButton}
          icon={<ApproveToolIcon />}
          variant="outlined"
          onClick={() => onApprove('once')}
        >
          {t('toolApproval.approveOnce', '本次允许')}
        </Button>
        <Button
          className={styles.actionButton}
          variant="outlined"
          onClick={() => onApprove('always_tool')}
        >
          {t('toolApproval.approveAlwaysTool', '永久允许{{toolName}}', {
            toolName: message.toolName,
          })}
        </Button>
        <Button
          className={styles.actionButton}
          color="danger"
          variant="outlined"
          onClick={() => onDeny()}
        >
          {t('toolApproval.deny', '本次拒绝')}
        </Button>
      </div>
    </div>
  );
}
