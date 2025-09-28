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
import * as codeViewer from '@/state/codeViewer';
import * as fileChanges from '@/state/fileChanges';
import type { CodeNormalViewerMode, DiffStat } from '@/types/codeViewer';
import { diff, inferFileType } from '@/utils/codeViewer';
import CodeDiffView from '../CodeViewer/CodeDiffView';
import CodeNormalView from '../CodeViewer/CodeNormalView';
import DiffStatBlocks from '../CodeViewer/DiffStatBlocks';
import DevFileIcon from '../DevFileIcon';
import MessageWrapper from '../MessageWrapper';

interface Props {
  readonly path: string;
  readonly edit: fileChanges.FileEdit;
  readonly normalViewerMode?: CodeNormalViewerMode;
  readonly loading?: boolean;
  readonly state: 'call' | 'result';
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

const CodeDiffOutline = (props: Props) => {
  const { path, loading, normalViewerMode, edit, state } = props;
  const { writeText } = useClipboard();
  const [isCopySuccess, setIsCopySuccess] = useState(false);
  const { t } = useTranslation();

  const { editStatus, old_string: oldString, new_string: newString } = edit;

  const { files } = useSnapshot(fileChanges.fileChangesState);

  // Used for file modification
  const file = useMemo(() => files[path], [files, path]);

  const code = useMemo(() => {
    if (!file) {
      return {
        oldContent: '',
        newContent: '',
      };
    }

    const replacedContent = oldString
      ? file.content.replace(oldString, newString || '')
      : file.content;

    const oldContent = file.content;

    const newContent = replacedContent;

    return {
      oldContent,
      newContent,
    };
  }, [file, oldString, newString]);

  // Used for display
  const [earlyFile, setEarlyFile] = useState<typeof file>();

  useEffect(() => {
    if (!earlyFile && file) {
      // Record the initial state of file
      setEarlyFile(file);
    }
  }, [file]);

  const earlyCode = useMemo(() => {
    if (!earlyFile) {
      return {
        oldContent: '',
        newContent: '',
      };
    }

    const replacedContent = oldString
      ? earlyFile.content.replace(oldString, newString || '')
      : earlyFile.content;

    const oldContent = earlyFile.content;

    const newContent = replacedContent;

    return {
      oldContent,
      newContent,
    };
  }, [earlyFile, oldString, newString]);

  const language = useMemo(() => inferFileType(path), [path]);

  const [diffStat, setDiffStat] = useState<DiffStat>();

  const { styles } = useStyles();

  useEffect(() => {
    diff(code.oldContent, code.newContent).then((d) => setDiffStat(d));
  }, [code]);

  const isNormalView = !!normalViewerMode;
  const isNewFile = normalViewerMode === 'new';

  const hasDiff = useMemo(
    () => diffStat?.diffBlockStats && diffStat.diffBlockStats.length > 0,
    [diffStat],
  );

  if (!file) {
    return null;
  }

  const handleAccept = (approveType: 'once' | 'always' | 'always_tool') => {
    fileChanges.fileChangesActions.acceptEdit(path, edit, normalViewerMode);
    // toolApprovalActions.approveToolUse(true, approveType);
    // TODO: add approval modal
  };

  const handleReject = () => {
    fileChanges.fileChangesActions.rejectEdit(path, edit, normalViewerMode);
    // toolApprovalActions.approveToolUse(false, 'once');
    // TODO: add approval modal
  };

  const handleShowCodeViewer = () => {
    const newGlobalContent =
      fileChanges.fileChangesActions.getFinalContent(path) || '';

    fileChanges.fileChangesActions.updateCodeViewerState(
      path,
      file.content,
      newGlobalContent,
      normalViewerMode,
    );
    codeViewer.actions.setVisible(true);
  };

  // Build status information
  const renderStatusContent = () => {
    if (!hasDiff || editStatus) return null;

    const elements = [];

    if (normalViewerMode) {
      if (normalViewerMode === 'new') {
        elements.push(
          <span key="new" className={styles.add}>
            (new)
          </span>,
        );
        if (diffStat?.addLines && diffStat.addLines > 0) {
          elements.push(
            <span key="addLines" className={styles.add}>
              +{diffStat.addLines.toLocaleString()}
            </span>,
          );
        }
      } else if (normalViewerMode === 'deleted') {
        elements.push(
          <span key="deleted" className={styles.remove}>
            (deleted)
          </span>,
        );
        if (diffStat?.removeLines && diffStat.removeLines > 0) {
          elements.push(
            <span key="removeLines" className={styles.remove}>
              -{diffStat.removeLines.toLocaleString()}
            </span>,
          );
        }
      }
    } else {
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
  const footers = [];
  if (hasDiff && !editStatus) {
    footers.push(
      {
        key: 'accept',
        text: t('toolApproval.approveOnce', '本次允许'),
        onClick: () => handleAccept('once'),
        icon: <ApproveToolIcon />,
      },
      {
        key: 'accept',
        text: t('toolApproval.approveAlwaysTool', '永久允许{{toolName}}', {
          toolName: 'edit' as const,
        }),
        onClick: () => handleAccept('always'),
      },
      {
        key: 'reject',
        text: t('toolApproval.deny', '拒绝'),
        onClick: handleReject,
        color: 'danger' as const,
      },
    );
  }

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
      {!loading && (
        <div className={styles.codeContainer}>
          {isNormalView ? (
            <CodeNormalView
              hideToolbar
              maxHeight={300}
              heightFollow="content"
              item={{
                language,
                path,
                code: isNewFile ? earlyCode.newContent : earlyCode.oldContent,
                viewType: 'normal',
                title: path,
                id: path,
                mode: normalViewerMode,
              }}
            />
          ) : (
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
          )}
        </div>
      )}
    </MessageWrapper>
  );
};

export default CodeDiffOutline;
