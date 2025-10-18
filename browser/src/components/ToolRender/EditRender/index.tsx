import CodeDiffOutline from '@/components/CodeDiffOutline';
import type { UIToolPart } from '@/types/chat';

export default function EditRender({ part }: { part: UIToolPart }) {
  const { id, input, state } = part;

  const { file_path, old_string, new_string } = input as {
    file_path: string;
    old_string: string;
    new_string: string;
  };

  return (
    <CodeDiffOutline
      path={file_path}
      edit={{
        toolCallId: id,
        old_string,
        new_string,
      }}
      state={state === 'tool_result' ? 'result' : 'call'}
    />
  );
}
