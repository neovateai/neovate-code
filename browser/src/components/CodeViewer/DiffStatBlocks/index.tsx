import { createStyles } from 'antd-style';
import classNames from 'classnames';
import { useMemo } from 'react';
import type { DiffStat } from '@/types/codeViewer';

interface Props {
  diffStat?: DiffStat;
}

const useStyles = createStyles(({ css, token }) => {
  return {
    addBlock: css`
      background-color: ${token.colorPrimary};
    `,
    removeBlock: css`
      background-color: red;
    `,
    normalBlock: css`
      background-color: gray;
    `,
    block: css`
      width: 8px;
      height: 8px;
      margin: 0 1px;
    `,
    diffStatBlocks: css`
      display: flex;
      align-items: center;
      margin-left: 8px;
    `,
  };
});

const DiffStatBlocks = (props: Props) => {
  const { diffStat } = props;

  const { styles } = useStyles();

  const diffStatArray = useMemo(() => {
    console.log(diffStat);

    if (!diffStat || diffStat.diffBlockStats.length === 0) {
      return Array.from({ length: 5 }).fill('normal');
    }

    if (diffStat.originalLines === 0) {
      // create new file
      return Array.from({ length: 5 }).fill('add');
    }

    if (diffStat.modifiedLines === 0) {
      // delete file
      return Array.from({ length: 5 }).fill('remove');
    }

    const totalChangedLines = diffStat.addLines + diffStat.removeLines;

    return new Array().concat(
      Array.from({
        length: parseInt(
          ((diffStat.addLines / totalChangedLines) * 4).toFixed(0),
        ),
      }).fill('add'),
      Array.from({
        length: parseInt(
          ((diffStat.removeLines / totalChangedLines) * 4).toFixed(0),
        ),
      }).fill('remove'),
      'normal',
    );
  }, [diffStat]);

  return (
    <div className={styles.diffStatBlocks}>
      {diffStatArray.map((statType, index) => {
        if (statType === 'add') {
          return (
            <div
              key={index}
              className={classNames(styles.addBlock, styles.block)}
            />
          );
        } else if (statType === 'remove') {
          return (
            <div
              key={index}
              className={classNames(styles.removeBlock, styles.block)}
            />
          );
        } else {
          return (
            <div
              key={index}
              className={classNames(styles.normalBlock, styles.block)}
            />
          );
        }
      })}
    </div>
  );
};

export default DiffStatBlocks;
