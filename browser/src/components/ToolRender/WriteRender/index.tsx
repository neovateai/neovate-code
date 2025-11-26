import CodeDiffOutline from '@/components/CodeDiffOutline';
import type { UIToolPart } from '@/types/chat';

export default function WriteRender({ part }: { part: UIToolPart }) {
  const { id, input, state } = part;
  const { file_path, content } = input as {
    file_path: string;
    content: string;
  };

  return (
    <CodeDiffOutline
      path={file_path}
      edit={{
        toolCallId: id,
        old_string: '',
        new_string: content,
      }}
      state={state === 'tool_result' ? 'result' : 'call'}
    />
  );
}
