import { Tag } from 'antd';
import { AiContextNodeConfig } from '@/types/chat';

export const AI_CONTEXT_NODE_CONFIGS: AiContextNodeConfig[] = [
  {
    matchRegex: /@File:\[(?<value>[^\]]+)\]/,
    aiContextId: 'file',
    pickInfo: (regExpExecArray) => ({
      value: regExpExecArray[0],
      displayText: regExpExecArray.groups?.value || '',
    }),
    render: ({ value, displayText }) => (
      <Tag
        color="red"
        className={'ai-context-node'}
        data-ai-context-id="file"
        contentEditable={false}
        style={{ userSelect: 'all' }}
      >
        {displayText}
      </Tag>
    ),
  },
  {
    matchRegex: /@Code:\[(?<value>[^\]]+)\]/,
    aiContextId: 'code',
    pickInfo: (regExpExecArray) => ({
      value: regExpExecArray[0],
      displayText: regExpExecArray.groups?.value || '',
    }),
    render: ({ value, displayText }) => (
      <Tag
        color="green"
        className={'ai-context-node'}
        data-ai-context-id="code"
        contentEditable={false}
        style={{ userSelect: 'all' }}
      >
        {displayText}
      </Tag>
    ),
  },
];
