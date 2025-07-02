import { createStyles } from 'antd-style';
import { useEffect, useMemo, useState } from 'react';
import { useSnapshot } from 'valtio';
import * as codeViewer from '@/state/codeViewer';
import * as fileChanges from '@/state/fileChanges';
import type { CodeNormalViewerMode, DiffStat } from '@/types/codeViewer';
import { diff, inferFileType } from '@/utils/codeViewer';
import CodeDiffView from '../CodeViewer/CodeDiffView';
import CodeNormalView from '../CodeViewer/CodeNormalView';
import CodeDiffOutlineHeader from './CodeDiffOutlineHeader';

interface Props {
  readonly path: string;
  readonly edit: fileChanges.FileEdit;
  readonly normalViewerMode?: CodeNormalViewerMode;
  readonly loading?: boolean;
}

const useStyles = createStyles(
  ({ css }, { isExpanded }: { isExpanded?: boolean }) => {
    return {
      root: css`
        background-color: #f3f4f6; /* bg-gray-100 */
        border-radius: 8px; /* rounded-md */
        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); /* shadow-sm */
        margin: 8px 0; /* my-2 */
      `,
      collapseWrapper: css`
        overflow: hidden;
        transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        max-height: ${isExpanded ? '500px' : '0'};
      `,
      innerContainer: css`
        width: 100%;
        border-radius: 8px;
        padding: 4px;
        background-color: #f9f9f9;
      `,
      item: css`
        padding: 8px 4px;
        margin: 4px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 4px;

        &:hover {
          background-color: #eee;
        }
      `,
      itemLeft: css`
        display: flex;
        align-items: center;
        column-gap: 8px;
      `,
      itemRight: css`
        display: flex;
        align-items: center;
        column-gap: 8px;
      `,
      itemDivider: css`
        margin: 0;
      `,
    };
  },
);

const CodeDiffOutline = (props: Props) => {
  const { path, loading, normalViewerMode, edit } = props;

  const { editStatus, old_string: oldString, new_string: newString } = edit;

  const { files } = useSnapshot(fileChanges.fileChangesState);

  // 修改文件使用
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

  // 展示使用
  const [earlyFile, setEarlyFile] = useState<typeof file>();

  useEffect(() => {
    if (!earlyFile && file) {
      // 记录file的最初状态
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
  const [isExpanded, setIsExpanded] = useState(true);

  const { styles } = useStyles({ isExpanded });

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

  const handleAccept = () => {
    fileChanges.fileChangesActions.updateFileState(
      path,
      (prevState) => {
        const nextEdit: fileChanges.FileEdit = {
          ...edit,
          editStatus: 'accept',
        };
        return {
          ...prevState,
          content: code.newContent,
          edits: prevState.edits.map((edit) =>
            edit.toolCallId === nextEdit.toolCallId ? nextEdit : edit,
          ),
        };
      },
      normalViewerMode,
    );
    fileChanges.fileChangesActions.writeFileContent(path, code.newContent);
  };

  const handleReject = () => {
    fileChanges.fileChangesActions.updateFileState(
      path,
      (prevState) => {
        const nextEdit: fileChanges.FileEdit = {
          ...edit,
          editStatus: 'reject',
        };
        return {
          ...prevState,
          content: code.oldContent,
          edits: prevState.edits.map((edit) =>
            edit.toolCallId === nextEdit.toolCallId ? nextEdit : edit,
          ),
        };
      },
      normalViewerMode,
    );
    fileChanges.fileChangesActions.writeFileContent(path, code.oldContent);
  };

  return (
    <div className={styles.root}>
      <CodeDiffOutlineHeader
        loading={loading}
        diffStat={diffStat}
        showDiffActionsAndInfo={hasDiff && !editStatus}
        editStatus={editStatus}
        path={path}
        normalViewMode={normalViewerMode}
        onAccept={handleAccept}
        onReject={handleReject}
        onShowCodeViewer={() => {
          const newGlobalContent =
            fileChanges.fileChangesActions.getFinalContent(path) || '';

          fileChanges.fileChangesActions.updateCodeViewerState(
            path,
            file.content,
            newGlobalContent,
            normalViewerMode,
          );
          codeViewer.actions.setVisible(true);
        }}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />

      {!loading && (
        <div className={styles.collapseWrapper}>
          <div className={styles.innerContainer}>
            {isNormalView ? (
              <CodeNormalView
                hideToolbar
                maxHeight={300}
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
        </div>
      )}
    </div>
  );
};

export default CodeDiffOutline;
