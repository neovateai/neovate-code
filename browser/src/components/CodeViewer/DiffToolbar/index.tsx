import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';
import * as codeViewer from '@/state/codeViewer';
import type { CodeDiffViewerTabItem } from '@/types/codeViewer';
import DiffStatBlocks from '../DiffStatBlocks';
import { useToolbarStyles } from '../NormalToolbar';

interface Props {
  item: CodeDiffViewerTabItem;
  onGotoDiff: (target: 'next' | 'previous') => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

const useStyles = createStyles(({ css, token }) => {
  return {
    add: css`
      color: ${token.colorPrimary};
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
    diffStatBlocks: css`
      display: flex;
      align-items: center;
      margin-left: 8px;
    `,
    tools: css`
      display: flex;
      align-items: center;
      column-gap: 12px;
    `,
  };
});

const DiffToolbar = (props: Props) => {
  const { item, onGotoDiff } = props;
  const { styles: toolbarStyles } = useToolbarStyles();
  const { styles } = useStyles();

  const { t } = useTranslation();

  const hasDiff =
    item.diffStat?.diffBlockStats && item.diffStat?.diffBlockStats.length > 0;

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
            <div className={styles.diffStatBlocks}>
              <DiffStatBlocks diffStat={item.diffStat} />
            </div>
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
              type="text"
              icon={<ArrowDownOutlined />}
              onClick={() => onGotoDiff('next')}
            />
          </Tooltip>
          <Tooltip
            title={t('codeViewer.toolButton.rejectAll')}
            placement="topRight"
          >
            <Button
              type="primary"
              danger
              icon={<CloseOutlined />}
              onClick={() => {
                if (item.path) {
                  codeViewer.actions.doEdit(item.path, 'reject');
                }
              }}
            />
          </Tooltip>
          <Tooltip
            title={t('codeViewer.toolButton.acceptAll')}
            placement="topRight"
          >
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => {
                if (item.path) {
                  codeViewer.actions.doEdit(item.path, 'accept');
                }
              }}
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export default DiffToolbar;
