import { CodeContextTag, FileContextTag } from '@/components/ContextTags';
import type { AiContextNodeConfig } from '@/types/chat';

export const AI_CONTEXT_NODE_CONFIGS: AiContextNodeConfig[] = [
  {
    matchRegex: /@File:\[(?<value>[^\]]+)\]/,
    aiContextId: 'file',
    pickInfo: (regExpExecArray) => ({
      value: regExpExecArray[0],
      displayText: regExpExecArray.groups?.value || '',
    }),
    render: ({ displayText }) => <FileContextTag displayText={displayText} />,
  },
  {
    matchRegex: /@Code:\[(?<value>[^\]]+)\]/,
    aiContextId: 'code',
    pickInfo: (regExpExecArray) => ({
      value: regExpExecArray[0],
      displayText: regExpExecArray.groups?.value || '',
    }),
    render: ({ displayText }) => <CodeContextTag displayText={displayText} />,
  },
];
