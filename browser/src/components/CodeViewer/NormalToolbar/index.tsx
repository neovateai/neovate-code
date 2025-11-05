import { CopyOutlined } from '@ant-design/icons';
import { Button, Divider, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import type {
  CodeNormalViewerMetaInfo,
  CodeNormalViewerTabItem,
} from '@/types/codeViewer';
import { useToolbarStyles } from '../useToolbarStyles';

interface Props {
  item: CodeNormalViewerTabItem;
  normalMetaInfo: CodeNormalViewerMetaInfo;
}

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
          <div>
            {normalMetaInfo.charCount} {t('codeViewer.charCount')}
          </div>
        </div>

        <div>
          <CopyIcon
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
