import { Sender } from '@ant-design/x';
import { Flex, Spin } from 'antd';
import React, { useCallback, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import type { ImageItem } from '@/api/model';
import { ContextType } from '@/constants/context';
import * as context from '@/state/context';
import AddContext from '../AddContext';
import SenderComponent from '../SenderComponent';

const SenderHeader: React.FC = () => {
  const { attachedContexts, loading } = useSnapshot(context.state);

  const handleRemoveContext = useCallback((value: string) => {
    context.actions.removeContext(value);
  }, []);

  const contextTags = useMemo(() => {
    return attachedContexts.map((contextItem, index) => (
      <SenderComponent.ContextTag
        closeable
        key={index}
        label={contextItem.displayText}
        value={contextItem.value}
        onClose={handleRemoveContext}
        image={
          contextItem.type === ContextType.IMAGE
            ? (contextItem.context as ImageItem).src
            : undefined
        }
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
