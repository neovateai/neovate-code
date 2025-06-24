import type { ToolMessage } from '@/types/message';

export default function WriteRender({ message }: { message: ToolMessage }) {
  console.log('message', message);
  return <div>WriteRender</div>;
}
