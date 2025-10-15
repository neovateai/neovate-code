import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={t('settings.title')}
      open={open}
      footer={null}
      width={880}
      centered
      className="[&_.ant-modal-body]:max-h-[70vh] [&_.ant-modal-body]:overflow-y-auto [&_.ant-modal-body]:p-6"
    >
      配置管理
    </Modal>
  );
};

export default SettingsModal;
