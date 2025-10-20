import { useSearch } from '@tanstack/react-router';
import { useMount } from 'ahooks';
import { Spin, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { ExternalLinkIcon, FolderPlusIcon, GitBranchIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { openProjectInEditor } from '@/api/project';
import { actions, state } from '@/state/project';

const useStyles = createStyles(({ css, token }) => {
  return {
    projectInfoArea: css`
      margin-top: 10px;
    `,

    projectCard: css`
      padding: 12px;
      background: ${token.colorBgContainer};
      border: 1px solid ${token.colorBorderSecondary};
      border-radius: 8px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;

      &:hover {
        background: ${token.colorBgTextHover};
        border-color: ${token.colorBorder};
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }
    `,

    projectName: css`
      font-size: 14px;
      font-weight: 600;
      color: ${token.colorText};
      margin-bottom: 6px;
      line-height: 1.2;
      word-break: break-all;
    `,

    projectPath: css`
      font-size: 11px;
      color: ${token.colorTextTertiary};
      margin-bottom: 8px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      line-height: 1.2;
      word-break: break-all;
    `,

    gitInfo: css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    `,

    branchInfo: css`
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      min-width: 0;

      svg {
        width: 12px;
        height: 12px;
        color: ${token.colorTextSecondary};
        flex-shrink: 0;
      }
    `,

    branchName: css`
      font-size: 11px;
      color: ${token.colorTextSecondary};
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `,

    openInEditorButton: css`
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3px;
      background: ${token.colorPrimary};
      color: ${token.colorWhite};
      border: none;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
      width: 18px;
      height: 18px;

      svg {
        width: 10px;
        height: 10px;
        flex-shrink: 0;
      }

      &:hover {
        background: ${token.colorPrimaryHover};
        transform: scale(1.1);
      }

      &:active {
        transform: scale(0.95);
      }

      &:disabled {
        background: ${token.colorTextDisabled};
        color: ${token.colorTextDisabled};
        cursor: not-allowed;
        transform: none;
        opacity: 0.6;
      }
    `,

    noProject: css`
      padding: 8px;
      background: ${token.colorBgContainer};
      border: 1px dashed ${token.colorBorderSecondary};
      border-radius: 8px;
      text-align: center;
      color: ${token.colorTextSecondary};
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      line-height: 1.4;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: ${token.colorBgTextHover};
        border-color: ${token.colorBorder};
        color: ${token.colorText};
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }

      .no-project-icon {
        width: 16px;
        height: 16px;
        opacity: 0.6;
        margin-right: 8px;
      }

      &:hover .no-project-icon {
        opacity: 0.8;
      }
    `,
  };
});

const ProjectInfoArea: React.FC = () => {
  const { styles } = useStyles();
  const { t } = useTranslation();
  const { projectInfo, loading } = useSnapshot(state);
  const [isOpening, setIsOpening] = useState(false);
  const { folder } = useSearch({ from: '/session/' });

  useMount(() => {
    actions.getProjectInfo(folder);
  });

  const handleOpenInEditor = async () => {
    if (!projectInfo?.path || isOpening) {
      return;
    }

    setIsOpening(true);
    try {
      await openProjectInEditor(projectInfo.path);
    } catch (error) {
      console.error('Failed to open project in editor:', error);
    } finally {
      setIsOpening(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.projectInfoArea}>
        <div className="flex justify-center items-center">
          <Spin size="small" />
        </div>
      </div>
    );
  }

  if (!projectInfo) {
    return (
      <div className={styles.projectInfoArea}>
        <div className={styles.noProject}>
          <FolderPlusIcon className="no-project-icon" />
          <span>{t('project.noProject')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.projectInfoArea}>
      <div className={styles.projectCard}>
        <Tooltip title={projectInfo.path} placement="right">
          <div className={styles.projectName}>{projectInfo.name}</div>
        </Tooltip>
        <div className={styles.gitInfo}>
          <div className={styles.branchInfo}>
            <GitBranchIcon />
            <span className={styles.branchName}>
              {projectInfo.gitBranch || 'main'}
            </span>
          </div>

          <Tooltip title={t('project.openInEditor')}>
            <button
              className={styles.openInEditorButton}
              onClick={handleOpenInEditor}
              disabled={isOpening}
              title={isOpening ? '...' : t('project.openInEditor')}
            >
              <ExternalLinkIcon />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default ProjectInfoArea;
