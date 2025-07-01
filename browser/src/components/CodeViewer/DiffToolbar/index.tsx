import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CodeDiffViewerTabItem } from '@/types/codeViewer';
import DiffStatBlocks from '../DiffStatBlocks';
import { useToolbarStyles } from '../useToolbarStyles';

interface Props {
  item: CodeDiffViewerTabItem;
  onGotoDiff: (target: 'next' | 'previous') => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

const useStyles = createStyles(({ css }) => {
  return {
    add: css`
      color: #00b96b;
    `,
    remove: css`
      color: red;
    `,
    normal: css`
      color: gray;
    `,
    diffStat: css`
      display: flex;
      align-items: center;
    `,
    tools: css`
      display: flex;
      align-items: center;
      column-gap: 12px;
    `,
    normalButton: css`
      color: #6b7280;
    `,
    acceptButton: css`
      background-color: #00b96b;
      &:hover,
      &:active {
        background-color: #00b96b !important;
      }
    `,
  };
});

const DiffToolbar = (props: Props) => {
  const { item, onGotoDiff, onAcceptAll, onRejectAll } = props;
  const { styles: toolbarStyles } = useToolbarStyles();
  const { styles } = useStyles();

  const { t } = useTranslation();

  const hasDiff = useMemo(
    () =>
      item.diffStat?.diffBlockStats && item.diffStat?.diffBlockStats.length > 0,
    [item.diffStat],
  );

  return (
    <div className={toolbarStyles.toolbar}>
      <div className={toolbarStyles.metaInfo}>
        {item.diffStat && (
          <div className={styles.diffStat}>
            <div className={styles.add}>
              +{item.diffStat.addLines.toLocaleString()}
            </div>
            <div className={styles.remove}>
              -{item.diffStat.removeLines.toLocaleString()}
            </div>
            <DiffStatBlocks diffStat={item.diffStat} />
          </div>
        )}
      </div>
      {hasDiff && (
        <div className={styles.tools}>
          <Tooltip
            title={t('codeViewer.toolButton.prevDiff')}
            placement="topRight"
          >
            <Button
              className={styles.normalButton}
              type="text"
              icon={<ArrowUpOutlined />}
              onClick={() => onGotoDiff('previous')}
            />
          </Tooltip>
          <Tooltip
            title={t('codeViewer.toolButton.nextDiff')}
            placement="topRight"
          >
            <Button
              className={styles.normalButton}
              type="text"
              icon={<ArrowDownOutlined />}
              onClick={() => onGotoDiff('next')}
            />
          </Tooltip>
          {!item.hideDiffActions && (
            <>
              <Button
                danger
                type="primary"
                icon={<CloseOutlined />}
                onClick={() => onRejectAll()}
              >
                {t('codeViewer.toolButton.rejectAll')}
              </Button>

              <Button
                className={styles.acceptButton}
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => onAcceptAll()}
              >
                {t('codeViewer.toolButton.acceptAll')}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DiffToolbar;
