import { CheckOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import CopyIcon from '@/icons/copy.svg?react';
import type { CodeDiffViewerTabItem } from '@/types/codeViewer';
import styles from './index.module.css';

interface Props {
  item: CodeDiffViewerTabItem;
  onCopy?: () => void;
  isCopySuccess?: boolean;
}

const DiffToolbar = (props: Props) => {
  const { onCopy, isCopySuccess = false } = props;
  const { t } = useTranslation();

  return (
    <div className={styles.actionBar}>
      <div className={styles.leftSection}>
        <div className={styles.statusText}>
          {t('codeViewer.diffToolbar.changesCompleted')}
        </div>
      </div>

      <Button
        className={styles.copyButton}
        type="text"
        icon={isCopySuccess ? <CheckOutlined /> : <CopyIcon />}
        onClick={onCopy}
        title={
          isCopySuccess ? t('codeViewer.copySuccess') : t('markdown.copyCode')
        }
      />
    </div>
  );
};

export default DiffToolbar;
