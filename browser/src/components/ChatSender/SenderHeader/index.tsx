import { Sender } from '@ant-design/x';
import { Flex } from 'antd';
import { useSnapshot } from 'valtio';
import { AI_CONTEXT_NODE_CONFIGS } from '@/constants/aiContextNodeConfig';
import * as context from '@/state/context';
import type { ContextItem } from '@/types/context';
import AddContext from '../AddContext';

function renderContextTag(contextItem: ContextItem, onClose?: () => void) {
  const { type, displayText, value } = contextItem;
  const config = AI_CONTEXT_NODE_CONFIGS.find((config) => config.type === type);

  if (!config) {
    return null;
  }

  return config.render({ displayText, value }, onClose);
}

const SenderHeader: React.FC = () => {
  const { editorContexts, selectContexts } = useSnapshot(context.state);

  return (
    <Sender.Header
      closable={false}
      open={true}
      styles={{ content: { padding: 0 } }}
    >
      <Flex gap={2} wrap="wrap" style={{ padding: 8, lineHeight: '22px' }}>
        <AddContext />
        {selectContexts.map((contextItem) =>
          renderContextTag(contextItem, () => {
            context.actions.removeSelectContext(contextItem.value);
          }),
        )}
        {editorContexts.map((contextItem) =>
          renderContextTag(contextItem, () => {
            context.actions.removeEditorContext(contextItem.value);
          }),
        )}
      </Flex>
    </Sender.Header>
  );
};

export default SenderHeader;
