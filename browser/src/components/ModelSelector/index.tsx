import { DownOutlined, PlusOutlined } from '@ant-design/icons';
import { Avatar, Popover } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/model';
import type { Model } from '@/types/model';
import AddModelModal from './AddModelModal';

const useStyles = createStyles(({ token, css }) => {
  return {
    modelButton: css`
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border-radius: ${token.borderRadius}px;
      cursor: pointer;
      transition: background-color 0.2s;
      &:hover {
        background-color: ${token.colorBgTextHover};
      }
    `,
    modelIcon: css`
      width: 20px;
      height: 20px;
      border-radius: 50%;
    `,
    modelName: css`
      font-size: 14px;
      color: ${token.colorText};
    `,
    modelList: css`
      width: 240px;
      max-height: 320px;
      overflow-y: auto;
      padding: 4px 0 0 0;
      display: flex;
      flex-direction: column;
    `,
    modelListContent: css`
      flex: 1;
      overflow-y: auto;
      padding: 0 0 8px 0;
    `,
    modelItem: css`
      padding: 10px 16px;
      margin: 0 4px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s ease;
      border: none;
      &:hover {
        background-color: ${token.colorFillQuaternary};
        transform: translateY(-1px);
      }
    `,
    modelItemSelected: css`
      background-color: ${token.colorPrimaryBg};
      color: ${token.colorPrimary};
      &:hover {
        background-color: ${token.colorPrimaryBg};
      }
    `,
    modelItemIcon: css`
      width: 24px;
      height: 24px;
      border-radius: 50%;
      flex-shrink: 0;
    `,
    modelItemName: css`
      font-size: 14px;
      font-weight: 500;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `,
    addModelButton: css`
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px 0;
      margin: 0;
      cursor: pointer;
      color: ${token.colorPrimary};
      transition: all 0.2s;
      background-color: ${token.colorBgContainer};
      font-size: 13px;
      border-top: 1px solid ${token.colorBorderSecondary};
      margin-top: 4px;
      &:hover {
        background-color: ${token.colorFillQuaternary};
      }
    `,
  };
});

export interface ModelSelectorProps {
  className?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ className }) => {
  const { styles } = useStyles();
  const snapshot = useSnapshot(state);
  const currentModel = snapshot.currentModel;
  const models = snapshot.models;

  // Use local state to control Popover visibility
  const [visible, setVisible] = useState(false);

  const handleSelectModel = (model: Model) => {
    actions.setCurrentModel(model);
    setVisible(false);
  };

  const handleAddModel = () => {
    setVisible(false);
    actions.showAddModelModal();
  };

  const content = (
    <div className={styles.modelList}>
      <div className={styles.modelListContent}>
        {models.map((model) => (
          <div
            key={model.name}
            className={`${styles.modelItem} ${
              currentModel?.name === model.name ? styles.modelItemSelected : ''
            }`}
            onClick={() => handleSelectModel(model)}
          >
            <Avatar
              src={model.icon}
              className={styles.modelItemIcon}
              size="small"
            />
            <div className={styles.modelItemName}>{model.name}</div>
          </div>
        ))}
      </div>
      <div className={styles.addModelButton} onClick={handleAddModel}>
        <PlusOutlined style={{ marginRight: 4 }} /> Add Model
      </div>
    </div>
  );

  return (
    <>
      <div className={className}>
        <Popover
          content={content}
          trigger="click"
          open={visible}
          onOpenChange={setVisible}
          placement="topRight"
          arrow={false}
          overlayStyle={{ padding: 0 }}
        >
          <div className={styles.modelButton}>
            {currentModel && (
              <>
                <Avatar
                  src={currentModel.icon}
                  className={styles.modelIcon}
                  size="small"
                />
                <span className={styles.modelName}>{currentModel.name}</span>
                <DownOutlined style={{ fontSize: 12 }} />
              </>
            )}
          </div>
        </Popover>
      </div>
      <AddModelModal />
    </>
  );
};

export default ModelSelector;
