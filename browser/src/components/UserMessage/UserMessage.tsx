import { createStyles } from 'antd-style';
import { memo } from 'react';
import type { UIUserMessage } from '@/types/message';
import QuillEditor from '../QuillEditor';
import { QuillContext } from '../QuillEditor/QuillContext';

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
    max-width: 600px;
    width: fit-content;

    .ql-editor {
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

    p {
      margin: 0;
    }

    .ql-editor p {
      margin: 0 !important;
      line-height: 1.5em !important;
    }
  `,
  textWrapper: css`
    padding: 12px 15px;
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
  `,
}));

const UserMessage = (props: UserMessageProps) => {
  const { message } = props;
  const { styles } = useStyles();

  const { content, delta } = message;

  return (
    <div className={styles.container}>
      <div className={styles.messageBox}>
        {delta ? (
          <QuillContext
            value={{
              onQuillLoad: (quill) => quill.setContents(delta),
              readonly: true,
            }}
          >
            <QuillEditor />
          </QuillContext>
        ) : (
          <div className={styles.textWrapper}>{content}</div>
        )}
      </div>
    </div>
  );
};

export default memo(UserMessage);
