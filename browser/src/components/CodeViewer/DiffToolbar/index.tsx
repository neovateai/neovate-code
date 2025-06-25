import { useTranslation } from 'react-i18next';
import type {
  CodeDiffViewerMetaInfo,
  CodeDiffViewerTabItem,
} from '@/types/codeViewer';
import { useToolbarStyle } from '../NormalToolbar';

interface Props {
  item: CodeDiffViewerTabItem;
  metaInfo: CodeDiffViewerMetaInfo;
}

const DiffToolbar = (props: Props) => {
  const { item } = props;
  const { styles } = useToolbarStyle();

  const { t } = useTranslation();
  return (
    <div className={styles.toolbar}>
      <div className={styles.metaInfo}>MetaInfo</div>
      <div>Tools</div>
    </div>
  );
};

export default DiffToolbar;
