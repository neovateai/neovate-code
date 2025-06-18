import { Tag } from 'antd';

export const FileContextTag = ({ displayText }: { displayText: string }) => {
  return (
    <Tag
      color="red"
      className={'ai-context-node'}
      data-ai-context-id="file"
      contentEditable={false}
      style={{ userSelect: 'all' }}
    >
      {displayText}
    </Tag>
  );
};

export const CodeContextTag = ({ displayText }: { displayText: string }) => {
  return (
    <Tag
      color="green"
      className={'ai-context-node'}
      data-ai-context-id="code"
      contentEditable={false}
      style={{ userSelect: 'none', margin: '0 2px' }}
    >
      {displayText}
    </Tag>
  );
};
