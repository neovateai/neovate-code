import { createStyles } from 'antd-style';
import kmiPng from '@/assets/kmi-ai.png';

const useStyles = createStyles(({ css }) => {
  return {
    logo: css`
      width: 32px;
      display: block;
      margin: 0 auto;
    `,
    logContainer: css`
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    `,
  };
});

const Logo = () => {
  const { styles } = useStyles();
  return (
    <div className={styles.logContainer}>
      <img src={kmiPng} alt="Logo" className={styles.logo} />
    </div>
  );
};
export default Logo;
