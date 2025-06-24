import { DownOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { renderContextTag } from '../ChatSender/SenderHeader';
import type { UserMessage } from './UserMessage';

interface UserMessageFooterProps {
  message: UserMessage;
}

const useStyle = createStyles(({ css }) => {
  return {
    footerContainer: css`
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      max-width: 800px;
      row-gap: 6px;
    `,
    button: css`
      font-size: 12px;
    `,
    itemsContainer: css`
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      row-gap: 6px;
      max-height: 100px;
      overflow-y: auto;
    `,
  };
});

const UserMessageFooter = (props: UserMessageFooterProps) => {
  const { message } = props;

  const [showDetails, setShowDetails] = useState(false);

  const { styles } = useStyle();

  const { annotations } = message;

  const { contextItems = [] } = annotations?.[0];

  if (contextItems.length === 0) {
    return null;
  }

  return (
    <div className={styles.footerContainer}>
      <Button
        className={styles.button}
        size="small"
        type="text"
        icon={
          <DownOutlined
            style={{
              fontSize: '10px',
              rotate: showDetails ? '0deg' : '270deg',
            }}
          />
        }
        onClick={() => setShowDetails(!showDetails)}
      >
        已使用 {contextItems.length} 个引用
      </Button>
      {showDetails && (
        <div className={styles.itemsContainer}>
          {contextItems.map((contextItem) => renderContextTag(contextItem))}
        </div>
      )}
    </div>
  );
};

export default UserMessageFooter;
