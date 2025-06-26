import { ExpandAltOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import { useEffect, useState } from 'react';
import * as codeViewer from '@/state/codeViewer';
import type { CodeViewerLanguage, DiffStat } from '@/types/codeViewer';
import { diff } from '@/utils/codeViewer';

interface Props {
  path: string;
  originalCode: string;
  modifiedCode: string;
  language?: CodeViewerLanguage;
}

const useStyles = createStyles(({ css }) => {
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
    item: css`
      padding: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 4px;

      &:hover {
        background-color: #eee;
      }
    `,
    add: css`
      color: green;
    `,
    remove: css`
      color: red;
    `,
    expandIcon: css`
      margin: 0 8px;
    `,
  };
});

const CodeDiffOutline = (props: Props) => {
  const { path, originalCode, modifiedCode, language } = props;

  const { styles } = useStyles();

  const [diffStat, setDiffStat] = useState<DiffStat>();

  useEffect(() => {
    diff(originalCode, modifiedCode).then((d) => setDiffStat(d));
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>{path}</div>
        <div>
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
            <ExpandAltOutlined
              className={styles.expandIcon}
              onClick={() => {
                codeViewer.actions.displayDiffViewer({
                  path,
                  diffStat,
                  originalCode,
                  modifiedCode,
                  language,
                });
              }}
            />
          </div>
        </div>
      </div>
      <div className={styles.innerContainer}>
        {diffStat?.diffBlockStats.map((stat) => {
          return (
            <div
              className={styles.item}
              onClick={() => {
                codeViewer.actions.displayDiffViewer({
                  path,
                  diffStat,
                  originalCode,
                  modifiedCode,
                  language,
                });
                codeViewer.actions.jumpToLine(
                  path,
                  stat.modifiedStartLineNumber,
                );
              }}
            >
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
          );
        })}
      </div>
    </div>
  );
};

export default CodeDiffOutline;
