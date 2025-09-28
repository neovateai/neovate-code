import MessageWrapper from '@/components/MessageWrapper';
import SearchIcon from '@/icons/grep-search.svg?react';
import SuccessIcon from '@/icons/success.svg?react';
import type { UIToolPart } from '@/types/chat';

export default function GrepRender({ part }: { part: UIToolPart }) {
  const { pattern } = part.input as { pattern: string };

  return (
    <MessageWrapper
      icon={<SearchIcon />}
      statusIcon={<SuccessIcon />}
      title={pattern}
      showExpandIcon={false}
      expandable={false}
      defaultExpanded={false}
      actions={[
        {
          key: 'success',
          icon: <SuccessIcon />,
          onClick: () => {},
        },
      ]}
    />
  );
}
