import { CheckOutlined, CloseOutlined, CopyOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';
import type { DiffBlockStat } from '@/types/codeViewer';
import { withConfigProvider } from '../WithConfigProvider';

interface Props {
  diffBlockStat: DiffBlockStat;
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
  const { diffBlockStat } = props;

  const { styles } = useStyles();

  const { t } = useTranslation();

  // 该组件下所有子组件都必须确保className是string，否则click事件中monaco编辑器会报错

  return (
    <div className={styles.container || ''}>
      <Tooltip title={t('codeViewer.toolButton.copy')} className="">
        <Button
          className=""
          icon={<CopyOutlined />}
          size="small"
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
      </Tooltip>
      <Tooltip title={t('codeViewer.toolButton.reject')} className="">
        <Button
          className=""
          icon={<CloseOutlined />}
          type="primary"
          danger
          size="small"
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
      </Tooltip>
      <Tooltip title={t('codeViewer.toolButton.accept')} className="">
        <Button
          className=""
          icon={<CheckOutlined />}
          type="primary"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            console.log(diffBlockStat);
          }}
        />
      </Tooltip>
    </div>
  );
};

export default withConfigProvider(CodeDiffBlockActions);
