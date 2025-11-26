import { useMemo } from 'react';
import { useSnapshot } from 'valtio';
import MessageWrapper from '@/components/MessageWrapper';
import FolderIcon from '@/icons/folder.svg?react';
import { state } from '@/state/chat';
import type { UIToolPart } from '@/types/chat';
import { jsonSafeParse } from '@/utils/message';
import InnerList, { type ListItem } from '../LsRender/InnerList';

export default function GlobRender({ part }: { part: UIToolPart }) {
  const snap = useSnapshot(state);
  const { name, result } = part;
  const filenames = useMemo<string[]>(() => {
    if (typeof result?.llmContent === 'string') {
      return jsonSafeParse(result?.llmContent)?.filenames || [];
    }
    return [];
  }, [result?.llmContent]);

  const items = useMemo<ListItem[]>(() => {
    return filenames.map((filename) => ({
      name: snap.cwd ? filename.replace(snap.cwd, '') : filename,
      isDirectory: filename.endsWith('/'),
    }));
  }, [filenames, snap.cwd]);

  return (
    <MessageWrapper icon={<FolderIcon />} title={name}>
      <InnerList items={items} />
    </MessageWrapper>
  );
}
