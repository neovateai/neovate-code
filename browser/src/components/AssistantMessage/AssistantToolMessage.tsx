import type React from 'react';
import type { UIToolPart } from '@/types/chat';
import {
  BashRender,
  EditRender,
  FailRender,
  FetchRender,
  GlobRender,
  GrepRender,
  LsRender,
  ReadRender,
  TodoRender,
  WriteRender,
} from '../ToolRender';

const AssistantToolMessage: React.FC<{
  part: UIToolPart;
}> = ({ part }) => {
  const name = part.type === 'tool-result' ? part.toolName : part.name;
  const { result } = part;
  if (result?.isError) {
    return <FailRender part={part} />;
  }

  switch (name) {
    case 'grep':
      return <GrepRender part={part} />;
    case 'read':
      return <ReadRender part={part} />;
    case 'glob':
      return <GlobRender part={part} />;
    case 'ls':
      return <LsRender part={part} />;
    case 'bash':
      return <BashRender part={part} />;
    case 'fetch':
      return <FetchRender part={part} />;
    case 'edit':
      return <EditRender part={part} />;
    case 'write':
      return <WriteRender part={part} />;
    case 'todoRead':
    case 'todoWrite':
      return <TodoRender part={part} />;
    default:
      return <FailRender part={part} />;
  }
};

export default AssistantToolMessage;
