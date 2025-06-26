import {
  CheckOutlined,
  CloseOutlined,
  ExpandAltOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DevFileIcon from '@/components/DevFileIcon';
import * as codeViewer from '@/state/codeViewer';
import type {
  CodeViewerLanguage,
  DiffBlockStat,
  DiffStat,
} from '@/types/codeViewer';
import { diff } from '@/utils/codeViewer';
import CodeDiffView from '../CodeViewer/CodeDiffView';
import DiffStatBlocks from '../CodeViewer/DiffStatBlocks';
import { withConfigProvider } from '../CodeViewer/WithConfigProvider';

interface Props {
  readonly path: string;
  readonly originalCode: string;
  readonly modifiedCode: string;
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

const useStyles = createStyles(({ css, token }) => {
  return {
    container: css`
      min-width: 200px;
      border-radius: 8px;
      padding: 8px;

      user-select: none;

      background-color: #eee;

      display: flex;
      flex-direction: column;
    `,
    innerContainer: css`
      width: 100%;

      border-radius: 8px;
      padding: 4px;
      background-color: #f9f9f9;
    `,
    header: css`
      display: flex;
      align-items: center;
      justify-content: space-between;

      padding: 8px 2px;
    `,
    headerLeft: css`
      display: flex;
      justify-content: center;
      column-gap: 8px;
      margin-left: 8px;
    `,
    headerRight: css`
      display: flex;
      justify-content: center;
      column-gap: 12px;
      margin: 0 8px;
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
    itemLeftDiffStat: css`
      display: flex;
      align-items: center;
    `,
    itemRight: css`
      display: flex;
      align-items: center;
      column-gap: 8px;
    `,
    itemDivider: css`
      margin: 0;
    `,
    add: css`
      color: ${token.colorPrimary};
      margin: 0 2px;
    `,
    remove: css`
      color: red;
      margin: 0 2px;
    `,
    plainText: css`
      color: #333;
    `,
  };
});

const CodeDiffOutline = (props: Props) => {
  const { path, originalCode, modifiedCode, language, onChangeCode } = props;

  const [changed, setChanged] = useState(false);

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

  useEffect(() => {
    diff(currentCodes.originalCode, currentCodes.modifiedCode).then((d) =>
      setDiffStat(d),
    );
  }, [currentCodes]);

  const hasDiff =
    diffStat?.diffBlockStats && diffStat.diffBlockStats.length > 0;

  const { styles } = useStyles();

  const { t } = useTranslation();

  const handleAccept = (diffBlockStat: DiffBlockStat) => {
    setChanged(true);

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
    showDiff(nextCodes);
  };

  const handleReject = (diffBlockStat: DiffBlockStat) => {
    setChanged(true);

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
    showDiff(nextCodes);
  };

  const handleAcceptAll = () => {
    setChanged(true);
    const nextCodes = {
      ...currentCodes,
      originalCode: currentCodes.modifiedCode,
    };
    onChangeCode?.(currentCodes.modifiedCode, currentCodes.originalCode);
    setCurrentCodes(nextCodes);
    showDiff(nextCodes);
  };

  const handleRejectAll = () => {
    setChanged(true);
    const nextCodes = {
      ...currentCodes,
      modifiedCode: currentCodes.originalCode,
    };
    onChangeCode?.(currentCodes.originalCode, currentCodes.originalCode);
    setCurrentCodes(nextCodes);

    showDiff(nextCodes);
  };

  const handleRollback = () => {
    setChanged(false);
    onChangeCode?.(initailCodes.originalCode, currentCodes.originalCode);
    setCurrentCodes(initailCodes);

    showDiff(initailCodes);
  };

  const showDiff = async (currentCodes: {
    originalCode: string;
    modifiedCode: string;
  }) => {
    codeViewer.actions.registerEditFunction(path, (type, diffBlockStat) => {
      if (type === 'accept') {
        diffBlockStat ? handleAccept(diffBlockStat) : handleAcceptAll();
      } else {
        diffBlockStat ? handleReject(diffBlockStat) : handleRejectAll();
      }
    });

    diff(currentCodes.originalCode, currentCodes.modifiedCode).then(
      (diffStat) => {
        codeViewer.actions.displayDiffViewer({
          path,
          diffStat,
          originalCode: currentCodes.originalCode,
          modifiedCode: currentCodes.modifiedCode,
          language,
        });
      },
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <DevFileIcon size={16} fileExt={path.split('.').pop() || ''} />
          <div className={styles.plainText}>{path}</div>
          {hasDiff && (
            <div className={styles.itemLeftDiffStat}>
              {diffStat?.addLines && diffStat.addLines > 0 && (
                <span className={styles.add}>
                  +{diffStat.addLines.toLocaleString()}
                </span>
              )}
              {diffStat?.removeLines && diffStat.removeLines > 0 && (
                <span className={styles.remove}>
                  -{diffStat.removeLines.toLocaleString()}
                </span>
              )}
              <DiffStatBlocks diffStat={diffStat} />
            </div>
          )}
        </div>
        <div className={styles.headerRight}>
          {changed && (
            <Button
              icon={<RollbackOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleRollback();
              }}
            />
          )}
          {hasDiff && (
            <>
              <Button
                type="primary"
                icon={<CloseOutlined />}
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  handleRejectAll();
                }}
              >
                {t('codeViewer.toolButton.rejectAll')}
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAcceptAll();
                }}
              >
                {t('codeViewer.toolButton.acceptAll')}
              </Button>
              <Button
                type="text"
                shape="circle"
                onClick={() => {
                  showDiff(currentCodes);
                }}
                icon={<ExpandAltOutlined />}
              />
            </>
          )}
        </div>
      </div>

      <div className={styles.innerContainer}>
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
      </div>
    </div>
  );
};

export default withConfigProvider(CodeDiffOutline);
