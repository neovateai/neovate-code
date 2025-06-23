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
      className={'ai-context-node'}
      data-ai-context-id="file"
      contentEditable={false}
      style={{
        userSelect: 'none',
        margin: '0 2px',
        lineHeight: 'inherit',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {onClose && hover ? (
        <CloseOutlined className={styles.icon} onClick={onClose} />
      ) : (
        // <FileOutlined style={iconStyle} />
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
      className={'ai-context-node'}
      data-ai-context-id="code"
      contentEditable={false}
      style={{
        userSelect: 'none',
        margin: '0 2px',
        lineHeight: 'inherit',
      }}
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
      className={'ai-context-node'}
      data-ai-context-id="knowledge"
      contentEditable={false}
      style={{
        userSelect: 'none',
        margin: '0 2px',
        lineHeight: 'inherit',
      }}
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
