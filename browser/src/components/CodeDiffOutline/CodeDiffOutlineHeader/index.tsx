import {
  CheckOutlined,
  CloseOutlined,
  ExpandAltOutlined,
  LoadingOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';
import DiffStatBlocks from '@/components/CodeViewer/DiffStatBlocks';
import DevFileIcon from '@/components/DevFileIcon';
import type {
  CodeNormalViewerMode,
  CodeViewerEditStatus,
  DiffStat,
} from '@/types/codeViewer';

interface Props {
  showDiffActionsAndInfo?: boolean;
  diffStat?: DiffStat;
  path: string;
  editStatus?: CodeViewerEditStatus;
  normalViewMode?: CodeNormalViewerMode;
  onAccept?: () => void;
  onReject?: () => void;
  onShowCodeViewer?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  loading?: boolean;
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
        padding: 2px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
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
    showDiffActionsAndInfo,
    diffStat,
    path,
    editStatus,
    normalViewMode,
    onAccept,
    onShowCodeViewer,
    onReject,
    isExpanded,
    onToggleExpand,
    loading,
  } = props;

  const { styles } = useStyles({ isExpanded });

  const { t } = useTranslation();

  function renderAddLines(diffStat?: DiffStat) {
    return (
      !!(diffStat?.addLines && diffStat.addLines > 0) && (
        <span className={styles.add}>
          +{diffStat.addLines.toLocaleString()}
        </span>
      )
    );
  }

  function renderRemoveLines(diffStat?: DiffStat) {
    return (
      !!(diffStat?.removeLines && diffStat.removeLines > 0) && (
        <span className={styles.remove}>
          -{diffStat.removeLines.toLocaleString()}
        </span>
      )
    );
  }

  return (
    <div className={styles.header} onClick={onToggleExpand}>
      <div className={styles.headerLeft}>
        <span className={styles.rotateIcon}>
          {loading ? <LoadingOutlined /> : <RightOutlined />}
        </span>
        <DevFileIcon size={16} fileExt={path.split('.').pop() || ''} />
        <div className={styles.plainText}>{path}</div>
        {showDiffActionsAndInfo &&
          (normalViewMode ? (
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
          ))}
        {editStatus === 'accept' && <CheckOutlined className={styles.add} />}
        {editStatus === 'reject' && <CloseOutlined className={styles.remove} />}
      </div>
      <div className={styles.headerRight}>
        {showDiffActionsAndInfo && (
          <>
            <Tooltip title={t('codeViewer.toolButton.reject')}>
              <Button
                className={styles.normalButton}
                type="text"
                shape="circle"
                icon={<CloseOutlined />}
                onClick={onReject}
              />
            </Tooltip>
            <Tooltip title={t('codeViewer.toolButton.accept')}>
              <Button
                className={styles.normalButton}
                type="text"
                shape="circle"
                icon={<CheckOutlined />}
                onClick={onAccept}
              />
            </Tooltip>
          </>
        )}
        <Button
          className={styles.normalButton}
          type="text"
          shape="circle"
          onClick={onShowCodeViewer}
          icon={<ExpandAltOutlined />}
        />
      </div>
    </div>
  );
};

export default CodeDiffOutlineHeader;
