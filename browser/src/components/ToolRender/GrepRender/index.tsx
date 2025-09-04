import MessageWrapper from '@/components/MessageWrapper';
import SearchIcon from '@/icons/grep-search.svg?react';
import SuccessIcon from '@/icons/success.svg?react';
import type { ToolMessage } from '@/types/message';

export default function GrepRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;

  const { pattern } = message.args as { pattern: string };

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
