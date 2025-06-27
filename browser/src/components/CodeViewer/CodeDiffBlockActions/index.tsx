import { CheckOutlined, CloseOutlined, CopyOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';
import * as codeViewer from '@/state/codeViewer';
import type { CodeDiffViewerTabItem, DiffBlockStat } from '@/types/codeViewer';
import { withConfigProvider } from '../WithConfigProvider';

interface Props {
  diffBlockStat: DiffBlockStat;
  item: CodeDiffViewerTabItem;
}

const useStyles = createStyles(({ css }) => {
  return {
    container: css`
      width: 100%;
      height: 48px;
      display: flex;
      align-items: flex-end;
      column-gap: 8px;
      padding: 4px;
    `,
  };
});

const CodeDiffBlockActions = (props: Props) => {
  const { diffBlockStat, item } = props;

  const { styles } = useStyles();

  const { t } = useTranslation();

  // 该组件下所有子组件都必须确保className是string，否则click事件中monaco编辑器会报错
  // 是主题切换的功能，不影响正常使用

  const hasModifiedCode = diffBlockStat.modifiedEndLineNumber > 0;

  return (
    <div className={styles.container || ''}>
      {hasModifiedCode && (
        <Tooltip title={t('codeViewer.toolButton.copyModifiedCode')}>
          <Button
            icon={<CopyOutlined />}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              const copiedCode = item.modifiedCode
                .split('\n')
                .slice(
                  diffBlockStat.modifiedStartLineNumber - 1,
                  diffBlockStat.modifiedEndLineNumber,
                )
                .join('\n');
              navigator.clipboard.writeText(copiedCode);
            }}
          />
        </Tooltip>
      )}
      <Tooltip title={t('codeViewer.toolButton.reject')}>
        <Button
          icon={<CloseOutlined />}
          type="primary"
          danger
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            if (item.path) {
              codeViewer.actions.doEdit(item.path, 'reject', diffBlockStat);
            }
          }}
        />
      </Tooltip>
      <Tooltip title={t('codeViewer.toolButton.accept')}>
        <Button
          icon={<CheckOutlined />}
          type="primary"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            if (item.path) {
              codeViewer.actions.doEdit(item.path, 'accept', diffBlockStat);
            }
          }}
        />
      </Tooltip>
    </div>
  );
};

export default withConfigProvider(CodeDiffBlockActions);
