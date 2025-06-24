import type { ToolMessage } from '@/types/message';

export default function EditRender({ message }: { message: ToolMessage }) {
  console.log('message', message);
  return <div>EditRender</div>;
}
