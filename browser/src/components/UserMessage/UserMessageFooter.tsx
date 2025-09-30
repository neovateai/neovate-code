import { DownOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Message } from '@/types/chat';
import SenderComponent from '../ChatSender/SenderComponent';

interface UserMessageFooterProps {
  message: Message;
}

const useStyle = createStyles(({ css }) => {
  return {
    footerContainer: css`
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      max-width: 70%;
      margin-left: auto;
      row-gap: 6px;
    `,
    button: css`
      font-size: 12px;
      color: #8b8b8b;
      padding: 2px 8px;
      height: auto;

      &:hover {
        color: #110c22;
        background: rgba(246, 248, 251, 0.5);
      }
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

const UserMessageFooter = memo<UserMessageFooterProps>((props) => {
  const { message } = props;

  const [showDetails, setShowDetails] = useState(false);

  const { styles } = useStyle();
  const { t } = useTranslation();

  const { attachedContexts = [] } = message;

  const handleToggleDetails = useCallback(() => {
    setShowDetails((prev) => !prev);
  }, []);

  const contextTags = useMemo(() => {
    return attachedContexts?.map((contextItem, index) => (
      <SenderComponent.ContextTag
        key={index}
        label={contextItem.displayText}
        value={contextItem.value}
        context={contextItem.context}
        contextType={contextItem.type}
      />
    ));
  }, [attachedContexts]);

  const buttonText = useMemo(() => {
    return t('context.usedReferences', { count: attachedContexts.length });
  }, [attachedContexts.length, t]);

  if (attachedContexts.length === 0) {
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
        onClick={handleToggleDetails}
      >
        {buttonText}
      </Button>
      {showDetails && (
        <div className={styles.itemsContainer}>{contextTags}</div>
      )}
    </div>
  );
});

export default UserMessageFooter;
