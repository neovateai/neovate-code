import type React from 'react';
import { memo, useCallback, useEffect, useState } from 'react';
import Breadcrumb from './Breadcrumb';
import FolderTree from './FolderTree';
import styles from './index.module.css';
import type { FolderPickerProps } from './types';

const FolderPicker: React.FC<FolderPickerProps> = memo(
  ({ initialPath = '/', onFolderChange, height = 400, className }) => {
    const [currentPath, setCurrentPath] = useState(initialPath);

    const handlePathChange = useCallback(
      (newPath: string) => {
        setCurrentPath(newPath);
        onFolderChange?.(newPath);
      },
      [onFolderChange, currentPath],
    );

    useEffect(() => {
      setCurrentPath(initialPath);
    }, [initialPath]);

    return (
      <div
        className={`${styles.folderPicker} ${className || ''}`}
        style={{ height }}
      >
        <div className={styles.header}>
          <div className={styles.breadcrumbContainer}>
            <Breadcrumb
              currentPath={currentPath}
              onPathChange={handlePathChange}
            />
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.treeContainer}>
            <FolderTree
              key={currentPath}
              currentPath={currentPath}
              onPathChange={handlePathChange}
              height="100%"
            />
          </div>
        </div>
      </div>
    );
  },
);

export default FolderPicker;
