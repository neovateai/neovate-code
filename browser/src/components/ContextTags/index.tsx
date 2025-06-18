import {
  BookOutlined,
  CloseOutlined,
  CodeOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';
import type React from 'react';
import { useState } from 'react';

const iconStyle = {
  marginRight: 4,
};

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

  return (
    <Tag
      key={key}
      color="red"
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
        <CloseOutlined style={iconStyle} onClick={onClose} />
      ) : (
        <FileOutlined style={iconStyle} />
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
        <CloseOutlined style={iconStyle} onClick={onClose} />
      ) : (
        <CodeOutlined style={iconStyle} />
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

  return (
    <Tag
      key={key}
      color="blue"
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
        <CloseOutlined style={iconStyle} onClick={onClose} />
      ) : (
        <BookOutlined style={iconStyle} />
      )}
      {displayText}
    </Tag>
  );
};
