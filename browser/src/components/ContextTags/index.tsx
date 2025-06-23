import { BookOutlined, CloseOutlined, CodeOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import { createStyles } from 'antd-style';
import type React from 'react';
import { useState } from 'react';
import DevFileIcon from '../DevFileIcon';

const useStyle = createStyles(({ css }) => {
  return {
    icon: css`
      margin-right: 4px;
      width: 12px;
      height: 12px;
    `,
    tag: css`
      user-select: none;
      margin: 0 2px;
      line-height: inherit;
    `,
  };
});

export const FileContextTag = ({
  displayText,
  key,
  onClose,
}: {
  displayText: string;
  key?: React.Key;
  onClose?: () => void;
}) => {
  const [hover, setHover] = useState(false);

  const { styles } = useStyle();

  return (
    <Tag
      key={key}
      color="blue"
      className={styles.tag}
      data-ai-context-id="file"
      contentEditable={false}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {onClose && hover ? (
        <CloseOutlined className={styles.icon} onClick={onClose} />
      ) : (
        <DevFileIcon
          className={styles.icon}
          fileExt={displayText.split('.').pop() ?? ''}
        />
      )}
      {displayText}
    </Tag>
  );
};

export const CodeContextTag = ({
  displayText,
  key,
  onClose,
}: {
  displayText: string;
  key?: React.Key;
  onClose?: () => void;
}) => {
  const [hover, setHover] = useState(false);
  const { styles } = useStyle();

  return (
    <Tag
      key={key}
      color="green"
      className={styles.tag}
      data-ai-context-id="code"
      contentEditable={false}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {onClose && hover ? (
        <CloseOutlined className={styles.icon} onClick={onClose} />
      ) : (
        <CodeOutlined className={styles.icon} />
      )}
      {displayText}
    </Tag>
  );
};

export const KnowledgeContextTag = ({
  displayText,
  key,
  onClose,
}: {
  displayText: string;
  key?: React.Key;
  onClose?: () => void;
}) => {
  const [hover, setHover] = useState(false);
  const { styles } = useStyle();

  return (
    <Tag
      key={key}
      color="red"
      className={styles.tag}
      data-ai-context-id="knowledge"
      contentEditable={false}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {onClose && hover ? (
        <CloseOutlined className={styles.icon} onClick={onClose} />
      ) : (
        <BookOutlined className={styles.icon} />
      )}
      {displayText}
    </Tag>
  );
};

export const UploadFileContextTag = ({
  displayText,
  key,
  onClose,
}: {
  displayText: string;
  key?: React.Key;
  onClose?: () => void;
}) => {
  const [hover, setHover] = useState(false);
  const { styles } = useStyle();

  return (
    <Tag
      key={key}
      color="purple"
      className={styles.tag}
      data-ai-context-id="knowledge"
      contentEditable={false}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {onClose && hover ? (
        <CloseOutlined className={styles.icon} onClick={onClose} />
      ) : (
        <BookOutlined className={styles.icon} />
      )}
      {displayText}
    </Tag>
  );
};
