import type { ToolMessage } from '@/types/message';

export default function GrepRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;

  return <div>GrepRender</div>;
}
