import {
  CheckOutlined,
  CloseOutlined,
  ExpandAltOutlined,
} from '@ant-design/icons';
import { Button, ConfigProvider, Divider, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import * as codeViewer from '@/state/codeViewer';
import type { CodeViewerLanguage, DiffStat } from '@/types/codeViewer';
import { diff } from '@/utils/codeViewer';

interface Props {
  readonly path: string;
  readonly originalCode: string;
  readonly modifiedCode: string;
  /** 如果不传，默认使用path中的文件后缀推断 */
  language?: CodeViewerLanguage;
  /** 修改代码，可能会在 accept / rollback 时触发 */
  onChangeCode?: (newCode: string) => void;
}

// TODO 调用onChangeCode后再次调用actions.displayDiffViewer刷新视图

const useStyles = createStyles(({ css, token }) => {
  return {
    container: css`
      min-width: 200px;

      border-radius: 8px;
      padding: 8px;

      background-color: #eee;

      display: flex;
      flex-direction: column;
    `,
    innerContainer: css`
      width: 100%;

      border-radius: 8px;
      padding: 4px;
      background-color: #f9f9f9;
    `,
    header: css`
      display: flex;
      align-items: center;
      justify-content: space-between;

      padding: 8px 2px;
    `,
    headerLeft: css`
      display: flex;
      justify-content: center;
      column-gap: 8px;
    `,
    headerRight: css`
      display: flex;
      justify-content: center;
      column-gap: 12px;
      margin: 0 8px;
    `,
    item: css`
      padding: 8px 4px;
      margin: 4px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 4px;

      &:hover {
        background-color: #eee;
      }
    `,
    itemLeft: css`
      display: flex;
      align-items: center;
      column-gap: 8px;
      color: #555;
    `,
    itemRight: css`
      display: flex;
      align-items: center;
      column-gap: 8px;
    `,
    itemDivider: css`
      margin: 0;
    `,
    add: css`
      color: ${token.colorPrimary};
      margin: 0 2px;
    `,
    remove: css`
      color: red;
      margin: 0 2px;
    `,
  };
});

const CodeDiffOutline = (props: Props) => {
  const { path, originalCode, modifiedCode, language } = props;

  // 最初的代码状态，用于回滚
  const [initailCodes] = useState({
    originalCode,
    modifiedCode,
  });

  // 当前的代码状态，用于维护diff视图
  const [currentCodes, setCurrentCodes] = useState({
    originalCode,
    modifiedCode,
  });

  const [diffStat, setDiffStat] = useState<DiffStat>();

  useEffect(() => {
    diff(currentCodes.originalCode, currentCodes.modifiedCode).then((d) =>
      setDiffStat(d),
    );
  }, [currentCodes]);

  const { styles } = useStyles();

  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div>{path}</div>
          <div>
            {diffStat?.addLines && (
              <span className={styles.add}>
                +{diffStat.addLines.toLocaleString()}
              </span>
            )}
            {diffStat?.removeLines && (
              <span className={styles.remove}>
                -{diffStat.removeLines.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className={styles.headerRight}>
          <Button
            type="text"
            shape="circle"
            onClick={() => {
              codeViewer.actions.displayDiffViewer({
                path,
                diffStat,
                originalCode: currentCodes.originalCode,
                modifiedCode: currentCodes.modifiedCode,
                language,
              });
            }}
            icon={<ExpandAltOutlined />}
          />
          <Button type="primary" icon={<CloseOutlined />} danger>
            {t('codeViewer.toolButton.rejectAll')}
          </Button>
          <Button type="primary" icon={<CheckOutlined />}>
            {t('codeViewer.toolButton.acceptAll')}
          </Button>
        </div>
      </div>
      <div className={styles.innerContainer}>
        {diffStat?.diffBlockStats.map((stat, index) => {
          return (
            <>
              {index > 0 && <Divider className={styles.itemDivider} />}
              <div
                className={styles.item}
                onClick={() => {
                  codeViewer.actions.displayDiffViewer({
                    path,
                    diffStat,
                    originalCode: currentCodes.originalCode,
                    modifiedCode: currentCodes.modifiedCode,
                    language,
                  });
                  codeViewer.actions.jumpToLine(
                    path,
                    stat.modifiedStartLineNumber,
                  );
                }}
              >
                <div className={styles.itemLeft}>
                  <div>
                    L{stat.modifiedStartLineNumber}-{stat.modifiedEndLineNumber}
                  </div>
                  <div>
                    {stat.addLines && (
                      <span className={styles.add}>+{stat.addLines}</span>
                    )}
                    {stat.removeLines && (
                      <span className={styles.remove}>-{stat.removeLines}</span>
                    )}
                  </div>
                </div>
                <div className={styles.itemRight}>
                  <Tooltip title={t('codeViewer.toolButton.reject')}>
                    <Button
                      size="small"
                      type="primary"
                      icon={<CloseOutlined />}
                      danger
                    />
                  </Tooltip>
                  <Tooltip title={t('codeViewer.toolButton.accept')}>
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckOutlined />}
                    />
                  </Tooltip>
                </div>
              </div>
            </>
          );
        })}
      </div>
    </div>
  );
};

// HOC: withConfigProvider
function withConfigProvider<T extends object>(Component: FC<T>): FC<T> {
  return (props: T) => (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#00b96b',
        },
      }}
    >
      <Component {...props} />
    </ConfigProvider>
  );
}

export default withConfigProvider(CodeDiffOutline);
