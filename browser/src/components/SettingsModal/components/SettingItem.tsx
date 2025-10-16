import { Typography } from 'antd';
import { createStyles } from 'antd-style';
import clsx from 'classnames';

const { Title, Paragraph } = Typography;

const useStyles = createStyles(({ css }) => ({
  item: css`
    display: flex;
    flex-direction: row;
    gap: 16px;
    align-items: center;
  `,
  label: css`
  `,
  content: css`
    flex: 1;
    display: flex;
    justify-content: flex-end;
  `,
}));

interface SettingItemProps {
  label: string;
  description: string;
  content: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({
  label,
  description,
  content,
}) => {
  const { styles } = useStyles();
  const itemCls = clsx(styles.item, 'w-full');
  return (
    <div className={itemCls}>
      <div className={styles.label}>
        <Title level={4} className="!mb-2">
          {label}
        </Title>
        <Paragraph className="text-gray-600 dark:text-gray-400 !mb-3">
          {description}
        </Paragraph>
      </div>
      <div className={styles.content}>{content}</div>
    </div>
  );
};

export default SettingItem;
