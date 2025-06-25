import { CopyOutlined } from '@ant-design/icons';
import { Button, Divider } from 'antd';
import { createStyles } from 'antd-style';
import { filesize } from 'filesize';
import { useTranslation } from 'react-i18next';
import type {
  CodeDiffViewerMetaInfo,
  CodeNormalViewerMetaInfo,
  CodeViewerTool,
} from '@/types/codeViewer';

interface Props {
  tools?: CodeViewerTool[];
  normalMetaInfo?: CodeNormalViewerMetaInfo;
  diffMetaInfo?: CodeDiffViewerMetaInfo;
}

const useStyle = createStyles(({ css }) => {
  return {
    toolbar: css`
      height: 48px;
      padding: 4px 8px;
      margin: 0 0 6px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      column-gap: 12px;

      background-color: #f2f2f2;
      border-radius: 8px;
    `,
    metaInfo: css`
      display: flex;
      align-items: center;
      column-gap: 8px;
      font-size: 12px;
      margin: 0 6px;
    `,
  };
});

const Toolbar = (props: Props) => {
  const { tools, normalMetaInfo, diffMetaInfo } = props;

  const { styles } = useStyle();

  const { t } = useTranslation();

  const CopyTool = () => <Button type="text" icon={<CopyOutlined />} />;

  return (
    <div className={styles.toolbar}>
      {normalMetaInfo && (
        <div className={styles.metaInfo}>
          <div>{filesize(normalMetaInfo.size)}</div>
          <Divider type="vertical" dashed />
          <div>
            {normalMetaInfo.lineCount} {t('codeViewer.lineCount')}
          </div>
          <Divider type="vertical" dashed />
          <div>
            {normalMetaInfo.charCount} {t('codeViewer.charCount')}
          </div>
        </div>
      )}
      <CopyTool />
    </div>
  );
};

export default Toolbar;
