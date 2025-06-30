import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Button, Switch, Tooltip } from 'antd';
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
  onChangeShowBlockActions: (show: boolean) => void;
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
    tools: css`
      display: flex;
      align-items: center;
      column-gap: 12px;
    `,
    switch: css`
      display: flex;
      align-items: center;
      column-gap: 8px;
    `,
  };
});

const DiffToolbar = (props: Props) => {
  const {
    item,
    onGotoDiff,
    onChangeShowBlockActions,
    onAcceptAll,
    onRejectAll,
  } = props;
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
          <div className={styles.switch}>
            <Switch
              onChange={(checked) => {
                onChangeShowBlockActions(checked);
              }}
            />
            {t('codeViewer.toolButton.showBlockActions')}
          </div>
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
              onClick={() => onRejectAll()}
            />
          </Tooltip>
          <Tooltip
            title={t('codeViewer.toolButton.acceptAll')}
            placement="topRight"
          >
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => onAcceptAll()}
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export default DiffToolbar;
