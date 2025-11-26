import { Sender } from '@ant-design/x';
import { Flex, Spin } from 'antd';
import { useCallback, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import * as context from '@/state/context';
import AddContext from '../AddContext';
import SenderComponent from '../SenderComponent';

const SenderHeader: React.FC = () => {
  const { attachedContexts, loading } = useSnapshot(context.state);

  const handleRemoveContext = useCallback((value: string) => {
    context.actions.removeContext(value);
  }, []);

  const contextTags = useMemo(() => {
    return attachedContexts.map((contextItem) => (
      <SenderComponent.ContextTag
        closeable
        key={contextItem.value}
        label={contextItem.displayText}
        value={contextItem.value}
        onClose={handleRemoveContext}
        context={contextItem.context}
        contextType={contextItem.type}
      />
    ));
  }, [attachedContexts, handleRemoveContext]);

  return (
    <Sender.Header
      closable={false}
      open={true}
      styles={{ content: { padding: 0 } }}
      style={{ borderStyle: 'none' }}
    >
      <Spin spinning={loading}>
        <Flex gap={6} wrap="wrap" style={{ padding: 8, lineHeight: '22px' }}>
          <AddContext />
          {contextTags}
        </Flex>
      </Spin>
    </Sender.Header>
  );
};

export default SenderHeader;
