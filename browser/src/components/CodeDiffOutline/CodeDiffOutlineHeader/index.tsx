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
import type { DiffStat } from '@/types/codeViewer';

interface Props {
  hasDiff?: boolean;
  diffStat?: DiffStat;
  path: string;
  changed?: boolean;
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
    `,
  };
});

const CodeDiffOutlineHeader = (props: Props) => {
  const {
    hasDiff,
    diffStat,
    path,
    changed,
    onAcceptAll,
    onExpand,
    onRejectAll,
    onRollback,
  } = props;

  const { styles } = useStyles();

  const { t } = useTranslation();

  return (
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
              onRollback?.();
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
            <Button
              type="text"
              shape="circle"
              onClick={onExpand}
              icon={<ExpandAltOutlined />}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default CodeDiffOutlineHeader;
