import { CopyOutlined } from '@ant-design/icons';
import { Button, Divider, message } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';
import { useClipboard } from '@/hooks/useClipboard';
import type {
  CodeNormalViewerMetaInfo,
  CodeNormalViewerTabItem,
} from '@/types/codeViewer';

interface Props {
  item: CodeNormalViewerTabItem;
  normalMetaInfo: CodeNormalViewerMetaInfo;
}

export const useToolbarStyles = createStyles(({ css }) => {
  return {
    toolbar: css`
      height: 48px;
      padding: 4px 12px;
      margin: -8px 0 6px 0;
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

const NormalToolbar = (props: Props) => {
  const { normalMetaInfo, item } = props;

  const [messageApi, contextHolder] = message.useMessage();

  const { styles } = useToolbarStyles();

  const { t } = useTranslation();

  const { writeText } = useClipboard();

  return (
    <>
      {contextHolder}
      <div className={styles.toolbar}>
        <div className={styles.metaInfo}>
          <div>
            {normalMetaInfo.lineCount} {t('codeViewer.lineCount')}
          </div>
          <Divider type="vertical" dashed />
          <div>
            {normalMetaInfo.charCount} {t('codeViewer.charCount')}
          </div>
        </div>

        <div>
          <Button
            type="text"
            icon={<CopyOutlined />}
            onClick={async () => {
              try {
                await writeText(item.code);
                messageApi.success(t('codeViewer.copySuccess'));
              } catch (e) {
                console.error(e);
                messageApi.error(t('codeViewer.copyFail'));
              }
            }}
          />
        </div>
      </div>
    </>
  );
};

export default NormalToolbar;
