import {
  ExclamationCircleOutlined,
  FolderOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Empty, Input, Spin } from 'antd';
import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getFolderList } from '../../api/folders';
import FolderItem from './FolderItem';
import styles from './FolderTree.module.css';
import type { FolderItem as FolderItemType, FolderTreeProps } from './types';

const { Search } = Input;

const FolderTree: React.FC<FolderTreeProps> = memo(
  ({ currentPath, onPathChange, height }) => {
    const { t } = useTranslation();
    const [folders, setFolders] = useState<FolderItemType[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPath, setSelectedPath] = useState<string | null>(null);

    const fetchFolders = useCallback(
      async (path: string) => {
        setLoading(true);
        setError(null);

        try {
          const result = await getFolderList(path);
          if (result.success) {
            setFolders(result.data.children || []);
          } else {
            setError(result.message || t('folderPicker.fetchError'));
            setFolders([]);
          }
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : t('folderPicker.networkError');
          setError(errorMsg);
          setFolders([]);
        } finally {
          setLoading(false);
        }
      },
      [t],
    );

    const handleFolderSelect = useCallback(
      (folderPath: string) => {
        setSelectedPath(folderPath);
        onPathChange(folderPath);
      },
      [onPathChange],
    );

    const handleRetry = useCallback(() => {
      fetchFolders(currentPath);
    }, [fetchFolders, currentPath]);

    const filteredFolders = useMemo(() => {
      let filtered = folders;

      // Filter hidden folders (always hide folders starting with .)
      filtered = filtered.filter((folder) => !folder.hidden);

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter((folder) =>
          folder.name.toLowerCase().includes(query),
        );
      }

      // Sort by name
      return filtered.sort((a, b) => {
        return a.name.localeCompare(b.name, 'zh-CN', { numeric: true });
      });
    }, [folders, searchQuery]);

    // Clear selected state and force refresh when path changes
    useEffect(() => {
      setSelectedPath(null);
      // Force refresh folder list for current path
      if (currentPath) {
        fetchFolders(currentPath);
      }
    }, [currentPath, fetchFolders]);

    if (loading) {
      return (
        <div className={styles.loading} style={{ height }}>
          <Spin size="large" tip={t('folderPicker.loading')} />
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.error} style={{ height }}>
          <ExclamationCircleOutlined className={styles.errorIcon} />
          <div className={styles.errorMessage}>{error}</div>
          <Button
            type="primary"
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleRetry}
            className={styles.retryButton}
          >
            {t('folderPicker.retry')}
          </Button>
        </div>
      );
    }

    return (
      <div className={styles.folderTree} style={{ height }}>
        <div className={styles.toolbar}>
          <Search
            placeholder={t('folderPicker.searchPlaceholder')}
            allowClear
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleRetry}
            title={t('folderPicker.refresh')}
            className={styles.refreshButton}
          />
        </div>

        <div className={styles.folderList}>
          {filteredFolders.length === 0 ? (
            <div className={styles.emptyState}>
              {folders.length === 0 ? (
                <Empty
                  image={<FolderOutlined className={styles.emptyIcon} />}
                  description={t('folderPicker.emptyDirectory')}
                />
              ) : (
                <Empty
                  description={
                    searchQuery
                      ? t('folderPicker.noMatchingFolders')
                      : t('folderPicker.noVisibleFolders')
                  }
                />
              )}
            </div>
          ) : (
            filteredFolders.map((folder) => (
              <FolderItem
                key={folder.path}
                folder={folder}
                onSelect={handleFolderSelect}
                isSelected={selectedPath === folder.path}
              />
            ))
          )}
        </div>
      </div>
    );
  },
);

export default FolderTree;
