import { createStyles } from 'antd-style';
import kmiPng from '@/assets/kmi-ai.png';

const useStyles = createStyles(({ css }) => {
  return {
    logo: css`
      width: 32px;
      display: block;
      margin: 0 auto;
    `,
  };
});

const Logo = () => {
  const { styles } = useStyles();
  return <img src={kmiPng} alt="Logo" className={styles.logo} />;
};
export default Logo;
