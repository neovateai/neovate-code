import MessageWrapper from '@/components/MessageWrapper';
import FolderIcon from '@/icons/folder.svg?react';
import type { ToolMessage } from '@/types/message';
import type { IGlobToolResult } from '@/types/tool';
import InnerList, { type ListItem } from '../LsRender/InnerList';

export default function GlobRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;

  const { toolName, result } = message;
  const { filenames = [] } = (result?.data || {}) as IGlobToolResult;
  const { path } = message.args as { path: string };

  const items: ListItem[] = filenames.map((filename) => ({
    name: filename.replace(path, ''),
    isDirectory: filename.endsWith('/'),
  }));

  return (
    <MessageWrapper icon={<FolderIcon />} title={toolName}>
      <InnerList items={items} />
    </MessageWrapper>
  );
}
