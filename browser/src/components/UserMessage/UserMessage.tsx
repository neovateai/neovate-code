import { memo } from 'react';
import type { UIUserMessage } from '@/types/message';
import QuillEditor from '../QuillEditor';
import { QuillContext } from '../QuillEditor/QuillContext';

interface UserMessageProps {
  message: UIUserMessage;
}

const UserMessage = (props: UserMessageProps) => {
  const { message } = props;

  const { content, delta } = message;

  return (
    <div>
      {delta ? (
        <QuillContext
          value={{
            onQuillLoad: (quill) => quill.setContents(delta),
          }}
        >
          <QuillEditor />
        </QuillContext>
      ) : (
        content
      )}
    </div>
  );
};

export default memo(UserMessage);
