import { createStyles, cx } from 'antd-style';
import { memo, useMemo } from 'react';
import QuillEditor from '@/components/QuillEditor';
import { QuillContext } from '@/components/QuillEditor/QuillContext';
import { convertTextToDelta } from '@/components/QuillEditor/utils';
import { BLOT_NAME_CONTENT_REGEX } from '@/constants';
import type { UIUserMessage } from '@/types/chat';
import { getMessageText, isCanceledMessage } from '@/utils/message';

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
  canceled: css`
    color: #8b8b8b;
  `,
}));

function UserMessage(props: UserMessageProps) {
  const { message } = props;
  const { styles } = useStyles();
  const text = getMessageText(message);
  const isCanceled = isCanceledMessage(message);

  const delta = useMemo(() => {
    if (BLOT_NAME_CONTENT_REGEX.test(text)) {
      const delta = convertTextToDelta(text);
      return delta;
    }
    return null;
  }, [text]);

  const textCls = cx(styles.textWrapper, {
    [styles.canceled]: isCanceled,
  });

  if (message.hidden) {
    return null;
  }

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
          <div className={textCls}>{text}</div>
        )}
      </div>
    </div>
  );
}

export default memo(UserMessage);
