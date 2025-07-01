import {
  CheckOutlined,
  CloseOutlined,
  ExpandAltOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';
import DiffStatBlocks from '@/components/CodeViewer/DiffStatBlocks';
import DevFileIcon from '@/components/DevFileIcon';
import type {
  CodeDiffOutlineChangeType,
  CodeNormalViewerMode,
  DiffStat,
} from '@/types/codeViewer';

interface Props {
  hasDiff?: boolean;
  diffStat?: DiffStat;
  path: string;
  changed?: CodeDiffOutlineChangeType;
  rollbacked?: boolean;
  normalViewMode?: CodeNormalViewerMode;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onRollback?: () => void;
  onExpand?: () => void;
}

const useStyles = createStyles(({ css, token }) => {
  return {
    header: css`
      display: flex;
      align-items: center;
      justify-content: space-between;

      padding: 8px 2px;
    `,
    headerLeft: css`
      display: flex;
      align-items: center;
      column-gap: 8px;
      margin-left: 8px;
      white-space: nowrap;
      min-width: 0;
      flex: 1 1 0%;
    `,
    headerRight: css`
      display: flex;
      justify-content: center;
      column-gap: 12px;
      margin: 0 8px;
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
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 320px;
      display: block;
    `,
    itemLeftDiffStat: css`
      display: flex;
      align-items: center;
      column-gap: 8px;
    `,
  };
});

const CodeDiffOutlineHeader = (props: Props) => {
  const {
    hasDiff,
    diffStat,
    path,
    changed,
    rollbacked,
    normalViewMode,
    onAcceptAll,
    onExpand,
    onRejectAll,
    onRollback,
  } = props;

  const { styles } = useStyles();

  const { t } = useTranslation();

  function renderAddLines(diffStat?: DiffStat) {
    return (
      diffStat?.addLines &&
      diffStat.addLines > 0 && (
        <span className={styles.add}>
          +{diffStat.addLines.toLocaleString()}
        </span>
      )
    );
  }

  function renderRemoveLines(diffStat?: DiffStat) {
    return (
      diffStat?.removeLines &&
      diffStat.removeLines > 0 && (
        <span className={styles.remove}>
          -{diffStat.removeLines.toLocaleString()}
        </span>
      )
    );
  }

  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <DevFileIcon size={16} fileExt={path.split('.').pop() || ''} />
        <div className={styles.plainText}>{path}</div>
        {hasDiff && (
          <>
            {normalViewMode ? (
              <div className={styles.itemLeftDiffStat}>
                {normalViewMode === 'new' && (
                  <>
                    <span className={styles.add}>(new)</span>
                    {renderAddLines(diffStat)}
                  </>
                )}
                {normalViewMode === 'deleted' && (
                  <>
                    <span className={styles.remove}>(deleted)</span>
                    {renderRemoveLines(diffStat)}
                  </>
                )}
              </div>
            ) : (
              <div className={styles.itemLeftDiffStat}>
                {renderAddLines(diffStat)}
                {renderRemoveLines(diffStat)}
                <DiffStatBlocks diffStat={diffStat} />
              </div>
            )}
          </>
        )}
        {changed === 'accept' && <CheckOutlined className={styles.add} />}
        {changed === 'reject' && <CloseOutlined className={styles.remove} />}
      </div>
      <div className={styles.headerRight}>
        {changed && (
          <Button
            type="text"
            icon={<RollbackOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onRollback?.();
            }}
          />
        )}
        {hasDiff && !rollbacked && (
          <>
            <Button
              type="primary"
              icon={<CloseOutlined />}
              danger
              onClick={(e) => {
                e.stopPropagation();
                onRejectAll?.();
              }}
            >
              {t('codeViewer.toolButton.rejectAll')}
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onAcceptAll?.();
              }}
            >
              {t('codeViewer.toolButton.acceptAll')}
            </Button>
          </>
        )}
        <Button
          type="text"
          shape="circle"
          onClick={onExpand}
          icon={<ExpandAltOutlined />}
        />
      </div>
    </div>
  );
};

export default CodeDiffOutlineHeader;
