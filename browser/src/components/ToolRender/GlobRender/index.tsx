import MessageWrapper from '@/components/MessageWrapper';
import FolderIcon from '@/icons/folder.svg?react';
import type { UIToolPart } from '@/types/chat';
import type { IGlobToolResult } from '@/types/tool';
import InnerList, { type ListItem } from '../LsRender/InnerList';

export default function GlobRender({ part }: { part: UIToolPart }) {
  const { name, result } = part;
  const { filenames = [] } = (result?.returnDisplay || {}) as IGlobToolResult;
  console.log('GlobRender', result);
  const { path } = part.input as { path: string };

  const items: ListItem[] = filenames.map((filename) => ({
    name: path ? filename.replace(path, '') : filename,
    isDirectory: filename.endsWith('/'),
  }));

  return (
    <MessageWrapper icon={<FolderIcon />} title={name}>
      <InnerList items={items} />
    </MessageWrapper>
  );
}
