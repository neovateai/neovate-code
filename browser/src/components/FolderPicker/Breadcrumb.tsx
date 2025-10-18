import { RightOutlined } from '@ant-design/icons';
import { Breadcrumb as AntBreadcrumb } from 'antd';
import type React from 'react';
import { memo, useMemo } from 'react';
import styles from './Breadcrumb.module.css';
import type { BreadcrumbProps } from './types';

const Breadcrumb: React.FC<BreadcrumbProps> = memo(
  ({ currentPath, onPathChange }) => {
    const breadcrumbItems = useMemo(() => {
      if (!currentPath) return [];

      const parts = currentPath.split('/').filter(Boolean);
      const items: { key: string; title: React.ReactNode }[] = [];

      parts.forEach((part, index) => {
        const segmentPath = `/${parts.slice(0, index + 1).join('/')}`;
        const isLast = index === parts.length - 1;

        items.push({
          key: segmentPath,
          title: isLast ? (
            <span className={styles.currentPath}>{part}</span>
          ) : (
            <span
              onClick={() => {
                onPathChange(segmentPath);
              }}
              className={styles.breadcrumbButton}
            >
              {part}
            </span>
          ),
        });
      });

      return items;
    }, [currentPath, onPathChange]);

    return (
      <div className={styles.breadcrumbContainer}>
        <AntBreadcrumb
          separator={<RightOutlined className={styles.separator} />}
          items={breadcrumbItems}
          className={styles.breadcrumb}
        />
      </div>
    );
  },
);

Breadcrumb.displayName = 'Breadcrumb';

export default Breadcrumb;
