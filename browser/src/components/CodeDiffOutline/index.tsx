import {
  CheckOutlined,
  CloseOutlined,
  ExpandAltOutlined,
} from '@ant-design/icons';
import { createStyles } from 'antd-style';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { useClipboard } from '@/hooks/useClipboard';
import ApproveToolIcon from '@/icons/approveTool.svg?react';
import CopyIcon from '@/icons/copy.svg?react';
import { state as chatState } from '@/state/chat';
import * as codeViewer from '@/state/codeViewer';
import type { ApprovalResult } from '@/types/chat';
import type { CodeViewerEditStatus, DiffStat } from '@/types/codeViewer';
import { diff, inferFileType } from '@/utils/codeViewer';
import CodeDiffView from '../CodeViewer/CodeDiffView';
import DiffStatBlocks from '../CodeViewer/DiffStatBlocks';
import DevFileIcon from '../DevFileIcon';
import MessageWrapper from '../MessageWrapper';

export interface FileEdit {
  toolCallId: string;
  old_string: string;
  new_string: string;
  /** Represents the status of this edit, undefined means unmodified */
  editStatus?: CodeViewerEditStatus;
}

interface CodeDiffOutlineProps {
  path: string;
  edit: FileEdit;
  state: 'call' | 'result';
}

const useStyles = createStyles(({ css }) => {
  return {
    statusContainer: css`
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 8px;
    `,
    add: css`
      color: #00b96b;
      font-weight: 500;
    `,
    remove: css`
      color: #ff4d4f;
      font-weight: 500;
    `,
    codeContainer: css`
      width: 100%;
      border-radius: 8px;
      padding: 4px;
      background-color: #f9f9f9;
    `,
    titleContainer: css`
      display: flex;
      align-items: center;
      gap: 8px;
    `,
    title: css`
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 320px;
    `,
  };
});

const CodeDiffOutline = (props: CodeDiffOutlineProps) => {
  const { path, edit, state } = props;
  const snap = useSnapshot(chatState);
  const { writeText } = useClipboard();
  const [isCopySuccess, setIsCopySuccess] = useState(false);
  const { t } = useTranslation();

  const { editStatus, old_string, new_string } = edit;

  const code = useMemo(() => {
    return {
      oldContent: old_string,
      newContent: new_string,
    };
  }, [old_string, new_string]);

  // Used for display
  const [earlyFile, setEarlyFile] = useState<string>();

  useEffect(() => {
    if (!earlyFile && path) {
      // Record the initial state of file
      setEarlyFile(path);
    }
  }, [path]);

  const earlyCode = useMemo(() => {
    if (!earlyFile) {
      return {
        oldContent: '',
        newContent: '',
      };
    }
    return {
      oldContent: old_string,
      newContent: new_string,
    };
  }, [earlyFile, old_string, new_string]);

  const language = useMemo(() => inferFileType(path), [path]);

  const [diffStat, setDiffStat] = useState<DiffStat>();

  const { styles } = useStyles();

  useEffect(() => {
    diff(code.oldContent, code.newContent).then((d) => setDiffStat(d));
  }, [code]);

  const hasDiff = useMemo(
    () => diffStat?.diffBlockStats && diffStat.diffBlockStats.length > 0,
    [diffStat],
  );

  const handleAccept = (approveType: ApprovalResult) => {
    snap.approvalModal?.resolve(approveType);
  };

  const handleReject = () => {
    snap.approvalModal?.resolve('deny');
  };

  const handleShowCodeViewer = () => {
    codeViewer.actions.openCodeViewer(
      path,
      // TODO 恢复之前的逻辑
      earlyCode.oldContent,
      earlyCode.newContent,
    );
  };

  // Build status information
  const renderStatusContent = () => {
    if (!hasDiff || editStatus) return null;

    const elements = [];

    if (diffStat?.addLines && diffStat.addLines > 0) {
      elements.push(
        <span key="addLines" className={styles.add}>
          +{diffStat.addLines.toLocaleString()}
        </span>,
      );
    }
    if (diffStat?.removeLines && diffStat.removeLines > 0) {
      elements.push(
        <span key="removeLines" className={styles.remove}>
          -{diffStat.removeLines.toLocaleString()}
        </span>,
      );
    }
    if (diffStat) {
      elements.push(<DiffStatBlocks key="diffStat" diffStat={diffStat} />);
    }

    return elements.length > 0 ? (
      <div className={styles.statusContainer}>{elements}</div>
    ) : null;
  };

  const handleCopy = () => {
    writeText(code.newContent);
    setIsCopySuccess(true);
  };

  // Build action buttons
  const actions = [
    {
      key: 'copy',
      icon: isCopySuccess ? <CheckOutlined /> : <CopyIcon />,
      onClick: handleCopy,
    },
    {
      key: 'expand',
      icon: <ExpandAltOutlined />,
      onClick: handleShowCodeViewer,
    },
  ];

  // Build footer buttons
  const footers = useMemo(() => {
    if (snap.approvalModal) {
      return [
        {
          key: 'accept',
          text: t('toolApproval.approveOnce'),
          onClick: () => handleAccept('approve_once'),
          icon: <ApproveToolIcon />,
        },
        {
          key: 'accept',
          text: t('toolApproval.approveAlwaysTool', {
            toolName: 'edit' as const,
          }),
          onClick: () => handleAccept('approve_always_tool'),
        },
        {
          key: 'reject',
          text: t('toolApproval.deny'),
          onClick: handleReject,
          color: 'danger' as const,
        },
      ];
    }
    return [];
  }, [snap.approvalModal]);

  return (
    <MessageWrapper
      title={
        <div className={styles.titleContainer}>
          <div className={styles.title}>{path}</div>
          <div>{renderStatusContent()}</div>
        </div>
      }
      icon={<DevFileIcon size={16} fileExt={path.split('.').pop() || ''} />}
      statusIcon={
        editStatus === 'accept' ? (
          <CheckOutlined />
        ) : editStatus === 'reject' ? (
          <CloseOutlined />
        ) : undefined
      }
      defaultExpanded={state === 'call'}
      showExpandIcon={true}
      expandable={true}
      maxHeight={300}
      actions={actions}
      footers={footers}
    >
      <CodeDiffView
        hideToolBar
        maxHeight={300}
        heightFollow="content"
        item={{
          language,
          path,
          originalCode: earlyCode.oldContent,
          modifiedCode: earlyCode.newContent,
          viewType: 'diff',
          title: path,
          id: path,
          diffStat,
        }}
      />
    </MessageWrapper>
  );
};

export default CodeDiffOutline;
