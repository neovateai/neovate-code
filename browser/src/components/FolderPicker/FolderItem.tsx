import { FileOutlined, FolderFilled, FolderOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import type React from 'react';
import { memo, useCallback } from 'react';
import styles from './FolderItem.module.css';
import type { FolderItemProps } from './types';

const FolderItem: React.FC<FolderItemProps> = memo(
  ({ folder, onSelect, isSelected = false, level = 0 }) => {
    const handleClick = useCallback(() => {
      onSelect(folder.path);
    }, [folder.path, onSelect]);

    const getIcon = () => {
      if (folder.isPackage) {
        return <FileOutlined className={styles.packageIcon} />;
      }
      return isSelected ? (
        <FolderFilled className={styles.folderIcon} />
      ) : (
        <FolderOutlined className={styles.folderIcon} />
      );
    };

    return (
      <div
        className={`${styles.folderItem} ${
          isSelected ? styles.selected : ''
        } ${folder.hidden ? styles.hidden : ''}`}
        onClick={handleClick}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <div className={styles.content}>
          <div className={styles.iconAndName}>
            {getIcon()}
            <span className={styles.name}>{folder.name}</span>
            {folder.isPackage && <Tag color="magenta">npm</Tag>}
          </div>
        </div>
      </div>
    );
  },
);

export default FolderItem;
