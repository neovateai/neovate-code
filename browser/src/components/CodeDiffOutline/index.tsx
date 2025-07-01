import { createStyles } from 'antd-style';
import { useEffect, useMemo, useState } from 'react';
import { useSnapshot } from 'valtio';
import * as codeViewer from '@/state/codeViewer';
import type {
  CodeDiffOutlineChangeType,
  CodeViewerLanguage,
  DiffBlockStat,
  DiffStat,
} from '@/types/codeViewer';
import { diff } from '@/utils/codeViewer';
import CodeDiffView from '../CodeViewer/CodeDiffView';
import CodeNormalView from '../CodeViewer/CodeNormalView';
import CodeDiffOutlineHeader from './CodeDiffOutlineHeader';

interface Props {
  readonly path: string;
  readonly originalCode?: string;
  readonly modifiedCode?: string;
  /** 如果不传，默认使用path中的文件后缀推断 */
  language?: CodeViewerLanguage;
  /**
   * 修改代码，可能会在 accept / reject / rollback 时触发
   *
   * @param newCode 操作后，应当写入文件的代码
   * @param oldCode 本次操作前的原始代码
   */
  onChangeCode?: (newCode: string, oldCode: string) => void;
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
  const {
    path,
    originalCode = '',
    modifiedCode = '',
    language,
    onChangeCode,
  } = props;

  const [isExpanded, setIsExpanded] = useState(true);
  const [changed, setChanged] = useState<CodeDiffOutlineChangeType>();
  const [rollbacked, setRollbacked] = useState(false);

  const { visible: codeViewerVisible } = useSnapshot(codeViewer.state);

  // 最初的代码状态，用于回滚
  const [initailCodes] = useState({
    originalCode,
    modifiedCode,
  });

  // 当前的代码状态，用于维护diff视图
  const [currentCodes, setCurrentCodes] = useState({
    originalCode,
    modifiedCode,
  });

  const [diffStat, setDiffStat] = useState<DiffStat>();

  const isNewFile = useMemo(
    () => !originalCode && !!modifiedCode,
    [originalCode, modifiedCode],
  );

  const isDeletedFile = useMemo(
    () => !modifiedCode && !!originalCode,
    [originalCode, modifiedCode],
  );

  const isNormalView = useMemo(
    () => isNewFile || isDeletedFile,
    [isNewFile, isDeletedFile],
  );

  useEffect(() => {
    diff(currentCodes.originalCode, currentCodes.modifiedCode).then((d) =>
      setDiffStat(d),
    );
    codeViewer.actions.registerEditFunction(path, (type, diffBlockStat) => {
      if (type === 'accept') {
        diffBlockStat ? handleAccept(diffBlockStat) : handleAcceptAll();
      } else {
        diffBlockStat ? handleReject(diffBlockStat) : handleRejectAll();
      }
    });
  }, [currentCodes]);

  const hasDiff = useMemo(
    () => diffStat?.diffBlockStats && diffStat.diffBlockStats.length > 0,
    [diffStat],
  );

  const { styles } = useStyles({ isExpanded });

  const handleAccept = (diffBlockStat: DiffBlockStat) => {
    setChanged('accept');

    const {
      originalEndLineNumber,
      originalStartLineNumber,
      modifiedEndLineNumber,
      modifiedStartLineNumber,
    } = diffBlockStat;

    const needAddLines =
      modifiedEndLineNumber > 0
        ? currentCodes.modifiedCode
            .split('\n')
            .slice(modifiedStartLineNumber - 1, modifiedEndLineNumber)
        : [];

    const nextOriginalArray = currentCodes.originalCode.split('\n');
    const removedCount =
      originalEndLineNumber > 0
        ? originalEndLineNumber - originalStartLineNumber + 1
        : 0;
    const insertPosition =
      originalEndLineNumber > 0
        ? originalStartLineNumber - 1
        : originalStartLineNumber;

    nextOriginalArray.splice(insertPosition, removedCount, ...needAddLines);

    const nextOriginalCode = nextOriginalArray.join('\n');
    const nextCodes = { ...currentCodes, originalCode: nextOriginalCode };

    onChangeCode?.(nextOriginalCode, currentCodes.originalCode);
    setCurrentCodes(nextCodes);
    showCodeViewer(nextCodes, rollbacked);
  };

  const handleReject = (diffBlockStat: DiffBlockStat) => {
    setChanged('reject');

    const {
      originalEndLineNumber,
      originalStartLineNumber,
      modifiedEndLineNumber,
      modifiedStartLineNumber,
    } = diffBlockStat;

    const needAddLines =
      originalEndLineNumber > 0
        ? currentCodes.originalCode
            .split('\n')
            .slice(originalStartLineNumber - 1, originalEndLineNumber)
        : [];
    const nextModifiedArray = currentCodes.modifiedCode.split('\n');
    const removedCount =
      modifiedEndLineNumber > 0
        ? modifiedEndLineNumber - modifiedStartLineNumber + 1
        : 0;

    const insertPosition =
      modifiedEndLineNumber > 0
        ? modifiedStartLineNumber - 1
        : modifiedStartLineNumber;

    nextModifiedArray.splice(insertPosition, removedCount, ...needAddLines);

    const nextModifiedCode = nextModifiedArray.join('\n');
    const nextCodes = { ...currentCodes, modifiedCode: nextModifiedCode };
    onChangeCode?.(currentCodes.originalCode, currentCodes.originalCode);
    setCurrentCodes(nextCodes);
    showCodeViewer(nextCodes, rollbacked);
  };

  const handleAcceptAll = () => {
    setChanged('accept');
    const nextCodes = {
      ...currentCodes,
      originalCode: currentCodes.modifiedCode,
    };
    onChangeCode?.(currentCodes.modifiedCode, currentCodes.originalCode);
    setCurrentCodes(nextCodes);
    if (codeViewerVisible) {
      // refresh code viewer
      showCodeViewer(nextCodes, rollbacked);
    }
  };

  const handleRejectAll = () => {
    setChanged('reject');
    const nextCodes = {
      ...currentCodes,
      modifiedCode: currentCodes.originalCode,
    };
    onChangeCode?.(currentCodes.originalCode, currentCodes.originalCode);
    setCurrentCodes(nextCodes);
    if (codeViewerVisible) {
      // refresh code viewer
      showCodeViewer(nextCodes, rollbacked);
    }
  };

  const handleRollback = () => {
    setChanged(undefined);
    setRollbacked(true);
    onChangeCode?.(initailCodes.originalCode, currentCodes.originalCode);
    setCurrentCodes(initailCodes);
    if (codeViewerVisible) {
      // refresh code viewer
      showCodeViewer(initailCodes, true);
    }
  };

  const showCodeViewer = async (
    currentCodes: {
      originalCode: string;
      modifiedCode: string;
    },
    hideDiffActions: boolean,
  ) => {
    if (isNormalView) {
      codeViewer.actions.displayNormalViewer({
        path,
        code: isNewFile ? currentCodes.modifiedCode : currentCodes.originalCode,
        language,
        mode: isNewFile ? 'new' : isDeletedFile ? 'deleted' : undefined,
      });
    } else {
      diff(currentCodes.originalCode, currentCodes.modifiedCode).then(
        (diffStat) => {
          codeViewer.actions.displayDiffViewer({
            path,
            diffStat,
            originalCode: currentCodes.originalCode,
            modifiedCode: currentCodes.modifiedCode,
            language,
            hideDiffActions,
          });
        },
      );
    }
  };

  return (
    <div className={styles.root}>
      <CodeDiffOutlineHeader
        diffStat={diffStat}
        hasDiff={hasDiff}
        changed={changed}
        path={path}
        rollbacked={rollbacked}
        normalViewMode={
          isNewFile ? 'new' : isDeletedFile ? 'deleted' : undefined
        }
        onAcceptAll={handleAcceptAll}
        onRejectAll={handleRejectAll}
        onRollback={handleRollback}
        onExpand={() => showCodeViewer(currentCodes, rollbacked)}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />

      <div className={styles.collapseWrapper}>
        <div className={styles.innerContainer}>
          {isNormalView ? (
            <CodeNormalView
              hideToolbar
              height={300}
              item={{
                path,
                code: isNewFile
                  ? currentCodes.modifiedCode
                  : currentCodes.originalCode,
                viewType: 'normal',
                title: path,
                id: path,
                mode: isNewFile ? 'new' : isDeletedFile ? 'deleted' : undefined,
              }}
            />
          ) : (
            <CodeDiffView
              hideToolBar
              height={300}
              item={{
                path,
                originalCode: currentCodes.originalCode,
                modifiedCode: currentCodes.modifiedCode,
                viewType: 'diff',
                title: path,
                id: path,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeDiffOutline;
