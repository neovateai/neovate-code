import { useMemo } from 'react';
import { useSnapshot } from 'valtio';
import MessageWrapper from '@/components/MessageWrapper';
import SearchIcon from '@/icons/grep-search.svg?react';
import SuccessIcon from '@/icons/success.svg?react';
import { state } from '@/state/chat';
import type { UIToolPart } from '@/types/chat';
import { formatParamsDescription, jsonSafeParse } from '@/utils/message';
import type { ListItem } from '../LsRender/InnerList';
import InnerList from '../LsRender/InnerList';

export default function GrepRender({ part }: { part: UIToolPart }) {
  const snap = useSnapshot(state);
  const { result } = part;
  const title = useMemo(() => {
    return formatParamsDescription(part.input);
  }, [part.input]);

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
    <MessageWrapper
      icon={<SearchIcon />}
      statusIcon={<SuccessIcon />}
      title={title}
    >
      <InnerList items={items} />
    </MessageWrapper>
  );
}
