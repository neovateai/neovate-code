import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import classNames from 'classnames';
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
    addBlock: css`
      background-color: green;
    `,
    remove: css`
      color: red;
    `,
    removeBlock: css`
      background-color: red;
    `,
    normal: css`
      color: gray;
    `,
    normalBlock: css`
      background-color: gray;
    `,
    block: css`
      width: 8px;
      height: 8px;
      margin: 0 1px;
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

  function renderStatBlocks(item: CodeDiffViewerTabItem) {
    const { diffStat } = item;
    if (!diffStat) {
      return null;
    }

    const AddBlock = (
      <div className={classNames(styles.addBlock, styles.block)} />
    );

    const RemoveBlock = (
      <div className={classNames(styles.removeBlock, styles.block)} />
    );

    const NormalBlock = (
      <div className={classNames(styles.normalBlock, styles.block)} />
    );

    if (diffStat.originalLines === 0) {
      // create new file
      return Array.from({ length: 5 }).map(() => AddBlock);
    }
    if (diffStat.modifiedLines === 0) {
      // delete file
      return Array.from({ length: 5 }).map(() => RemoveBlock);
    }

    const totalChangedLines = diffStat.addLines + diffStat.removeLines;

    return new Array().concat(
      Array.from({
        length: parseInt(
          ((diffStat.addLines / totalChangedLines) * 4).toFixed(0),
        ),
      }).map(() => AddBlock),
      Array.from({
        length: parseInt(
          ((diffStat.removeLines / totalChangedLines) * 4).toFixed(0),
        ),
      }).map(() => RemoveBlock),
      NormalBlock,
    );
  }

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
              {renderStatBlocks(item)}
            </div>
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
