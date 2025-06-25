import { CopyOutlined } from '@ant-design/icons';
import { Button, Divider } from 'antd';
import { createStyles } from 'antd-style';
import { filesize } from 'filesize';
import { useTranslation } from 'react-i18next';
import type {
  CodeNormalViewerMetaInfo,
  CodeViewerTool,
} from '@/types/codeViewer';

interface Props {
  tools?: CodeViewerTool[];
  metaInfo: CodeNormalViewerMetaInfo;
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

      background-color: #eeeeee;
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
  const { tools, metaInfo } = props;

  const { styles } = useStyle();

  const { t } = useTranslation();

  const { size, lineCount, charCount } = metaInfo;

  const CopyTool = () => <Button type="text" icon={<CopyOutlined />} />;

  return (
    <div className={styles.toolbar}>
      <div className={styles.metaInfo}>
        <div>{filesize(size)}</div>
        <Divider type="vertical" />
        <div>
          {lineCount} {t('codeViewer.lineCount')}
        </div>
        <Divider type="vertical" />
        <div>
          {charCount} {t('codeViewer.charCount')}
        </div>
      </div>
      <CopyTool />
    </div>
  );
};

export default Toolbar;
