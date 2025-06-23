import { Sender } from '@ant-design/x';
import { Flex } from 'antd';
import { useSnapshot } from 'valtio';
import { AI_CONTEXT_NODE_CONFIGS } from '@/constants/context';
import * as context from '@/state/context';
import type { ContextItem } from '@/types/context';
import AddContext from '../AddContext';

export function renderContextTag(
  contextItem: ContextItem,
  onClose?: () => void,
) {
  const { type, displayText, value, context } = contextItem;
  const config = AI_CONTEXT_NODE_CONFIGS.find((config) => config.type === type);

  if (!config) {
    return null;
  }

  return config.render({ info: { displayText, value }, onClose, context });
}

const SenderHeader: React.FC = () => {
  const { contextItems } = useSnapshot(context.state);

  return (
    <Sender.Header
      closable={false}
      open={true}
      styles={{ content: { padding: 0 } }}
    >
      <Flex gap={6} wrap="wrap" style={{ padding: 8, lineHeight: '22px' }}>
        <AddContext />
        {contextItems.map((contextItem) =>
          renderContextTag(contextItem, () => {
            context.actions.removeContext(contextItem.value);
          }),
        )}
      </Flex>
    </Sender.Header>
  );
};

export default SenderHeader;
