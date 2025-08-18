import { createStyles } from 'antd-style';
import { memo } from 'react';
import { AI_CONTEXT_NODE_CONFIGS } from '@/constants/context';
import type { UIUserMessage } from '@/types/message';
import LexicalTextArea from '../ChatSender/LexicalTextArea';
import { LexicalTextAreaContext } from '../ChatSender/LexicalTextAreaContext';

interface UserMessageProps {
  message: UIUserMessage;
}

const useStyles = createStyles(({ css }) => ({
  container: css`
    display: flex;
    justify-content: flex-end;
    width: 100%;
  `,
  messageBox: css`
    background: #f6f8fb;
    border-radius: 10px;
    padding: 12px;
    max-width: 600px;
    width: fit-content;

    .lexical-editor {
      font-family:
        'PingFang SC',
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        sans-serif;
      font-size: 14px;
      line-height: 1.5em;
      color: #110c22;
    }

    .lexical-editor p {
      margin: 0 !important;
      line-height: 1.5em !important;
    }
  `,
}));

const UserMessage = (props: UserMessageProps) => {
  const { message } = props;
  const { styles } = useStyles();

  const { content, contextContent } = message;

  return (
    <div className={styles.container}>
      <div className={styles.messageBox}>
        <LexicalTextAreaContext
          value={{
            namespace: 'UserMessage',
            aiContextNodeConfigs: AI_CONTEXT_NODE_CONFIGS,
            value: contextContent ?? content,
          }}
        >
          <LexicalTextArea disabled />
        </LexicalTextAreaContext>
      </div>
    </div>
  );
};

export default memo(UserMessage);
