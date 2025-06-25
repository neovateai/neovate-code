import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';
import type { CodeDiffViewerTabItem } from '@/types/codeViewer';
import { useToolbarStyles } from '../NormalToolbar';

interface Props {
  item: CodeDiffViewerTabItem;
  onGotoDiff: (target: 'next' | 'previous') => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

const useStyles = createStyles(({ css }) => {
  return {
    add: css`
      color: green;
    `,
    remove: css`
      color: red;
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

  return (
    <div className={toolbarStyles.toolbar}>
      <div className={toolbarStyles.metaInfo}>
        {item.diffStat && (
          <div>
            <div className={styles.add}>+{item.diffStat.addLines}</div>
            <div className={styles.remove}>-{item.diffStat.removeLines}</div>
          </div>
        )}
      </div>
      <div className={styles.tools}>
        <Tooltip title={t('codeViewer.toolButton.prevDiff')}>
          <Button
            type="text"
            icon={<ArrowUpOutlined />}
            onClick={() => onGotoDiff('previous')}
          />
        </Tooltip>
        <Tooltip title={t('codeViewer.toolButton.nextDiff')}>
          <Button
            type="text"
            icon={<ArrowDownOutlined />}
            onClick={() => onGotoDiff('next')}
          />
        </Tooltip>
        <Tooltip title={t('codeViewer.toolButton.rejectAll')}>
          <Button type="primary" danger icon={<CloseOutlined />} />
        </Tooltip>
        <Tooltip title={t('codeViewer.toolButton.acceptAll')}>
          <Button type="primary" icon={<CheckOutlined />} />
        </Tooltip>
      </div>
    </div>
  );
};

export default DiffToolbar;
