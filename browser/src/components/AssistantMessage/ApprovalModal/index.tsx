import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import MessageWrapper from '@/components/MessageWrapper';
import { EditRender, WriteRender } from '@/components/ToolRender';
import ApproveToolIcon from '@/icons/approveTool.svg?react';
import BashIcon from '@/icons/bash.svg?react';
import SearchIcon from '@/icons/search.svg?react';
import { state } from '@/state/chat';
import type { ApprovalResult, UIToolPart } from '@/types/chat';
import styles from './index.module.css';

function ApprovalModal({ part }: { part: UIToolPart }) {
  const { t } = useTranslation();
  const snap = useSnapshot(state);

  if (!snap.approvalModal) {
    return null;
  }

  if (part.id !== snap.approvalModal.toolUse.callId) {
    return null;
  }

  const { name, params } = snap.approvalModal.toolUse;

  // Don't show approval confirmation for edit or write tools
  if (name === 'write') {
    return <WriteRender part={part} />;
  }

  if (name === 'edit') {
    return <EditRender part={part} />;
  }

  // Format tool parameter description, only fetch, bash, edit tools require approval
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

  const onApprove = (option: ApprovalResult) => {
    snap.approvalModal?.resolve(option);
  };

  const onDeny = () => {
    snap.approvalModal?.resolve('deny');
  };

  // const onRetry = () => {
  //   console.log('onRetry');
  // };

  // const iconWrapper = (icon: React.ReactNode, tooltip: string) => {
  //   return (
  //     <Tooltip title={tooltip}>
  //       <Spin spinning={isSubmitting}>{icon}</Spin>
  //     </Tooltip>
  //   );
  // };

  // if (hasError) {
  //   return (
  //     <MessageWrapper
  //       title={
  //         <div className="flex items-center gap-2">
  //           <CloseOutlined style={{ color: '#ff4d4f' }} />
  //           <span>{t('toolApproval.submitFailed')}</span>
  //         </div>
  //       }
  //       actions={[
  //         {
  //           key: 'retry',
  //           icon: iconWrapper(
  //             <RedoOutlined />,
  //             t('toolApproval.retry', '重试'),
  //           ),
  //           onClick: onRetry,
  //         },
  //       ]}
  //     >
  //       <div className="text-sm text-gray-500">{snap.submitError}</div>
  //     </MessageWrapper>
  //   );
  // }

  return (
    <div className={styles.container}>
      <MessageWrapper
        title={getToolDescription(name, params)}
        expandable={false}
        showExpandIcon={false}
        defaultExpanded={false}
      />
      <div className={styles.actions}>
        <Button
          className={styles.actionButton}
          icon={<ApproveToolIcon />}
          variant="outlined"
          onClick={() => onApprove('approve_once')}
        >
          {t('toolApproval.approveOnce')}
        </Button>
        {snap.approvalModal?.category === 'write' && (
          <Button
            className={styles.actionButton}
            variant="outlined"
            onClick={() => onApprove('approve_always_edit')}
          >
            {t('toolApproval.approveAlwaysEdit', {
              toolName: name,
            })}
          </Button>
        )}
        <Button
          className={styles.actionButton}
          variant="outlined"
          onClick={() => onApprove('approve_always_tool')}
        >
          {t('toolApproval.approveAlwaysTool', {
            toolName: name,
          })}
        </Button>
        <Button
          className={styles.actionButton}
          color="danger"
          variant="outlined"
          onClick={() => onDeny()}
        >
          {t('toolApproval.deny')}
        </Button>
      </div>
    </div>
  );
}

export default ApprovalModal;
