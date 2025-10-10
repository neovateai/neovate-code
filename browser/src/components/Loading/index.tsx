import { Spin } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ css }) => {
  return {
    loading: css`
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    `,
  };
});

const Loading: React.FC = () => {
  const { styles } = useStyles();
  return (
    <div className={styles.loading}>
      <Spin />
    </div>
  );
};

export default Loading;
