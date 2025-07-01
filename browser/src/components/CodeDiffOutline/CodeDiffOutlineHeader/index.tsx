import {
  CheckOutlined,
  CloseOutlined,
  ExpandAltOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
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
  normalViewMode?: CodeNormalViewerMode;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onShowCodeViewer?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const useStyles = createStyles(
  (
    { css },
    {
      isExpanded,
    }: {
      isExpanded?: boolean;
    },
  ) => {
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
        cursor: pointer;
      `,
      headerRight: css`
        display: flex;
        justify-content: center;
        align-items: center;
        column-gap: 12px;
        margin: 0 8px;
      `,
      add: css`
        color: #00b96b;
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
      rotateIcon: css`
        display: inline-block;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform: rotate(${isExpanded ? 90 : 0}deg);
      `,
      normalButton: css`
        color: #6b7280;
      `,
    };
  },
);

const CodeDiffOutlineHeader = (props: Props) => {
  const {
    hasDiff,
    diffStat,
    path,
    changed,
    normalViewMode,
    onAcceptAll,
    onShowCodeViewer: onExpand,
    onRejectAll,
    isExpanded,
    onToggleExpand,
  } = props;

  const { styles } = useStyles({ isExpanded });

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
      <div className={styles.headerLeft} onClick={onToggleExpand}>
        <span className={styles.rotateIcon}>
          <RightOutlined />
        </span>
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
        {hasDiff && (
          <>
            <Tooltip title={t('codeViewer.toolButton.reject')}>
              <Button
                className={styles.normalButton}
                type="text"
                shape="circle"
                icon={<CloseOutlined />}
                onClick={onRejectAll}
              />
            </Tooltip>
            <Tooltip title={t('codeViewer.toolButton.accept')}>
              <Button
                className={styles.normalButton}
                type="text"
                shape="circle"
                icon={<CheckOutlined />}
                onClick={onAcceptAll}
              />
            </Tooltip>
          </>
        )}
        <Button
          className={styles.normalButton}
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
