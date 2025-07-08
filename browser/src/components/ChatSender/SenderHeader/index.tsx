import { Sender } from '@ant-design/x';
import { Flex, Spin } from 'antd';
import React, { Fragment, useCallback, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { AI_CONTEXT_NODE_CONFIGS } from '@/constants/context';
import * as context from '@/state/context';
import type { ContextItem } from '@/types/context';
import AddContext from '../AddContext';

const CONFIG_MAP = new Map(
  AI_CONTEXT_NODE_CONFIGS.map((config) => [config.type, config]),
);

export const renderContextTag = (
  contextItem: ContextItem,
  onClose?: () => void,
) => {
  const { type, displayText, value, context } = contextItem;
  const config = CONFIG_MAP.get(type);

  if (!config) {
    return null;
  }

  return (
    <Fragment key={value}>
      {config.render({ info: { displayText, value }, onClose, context })}
    </Fragment>
  );
};

const SenderHeader: React.FC = () => {
  const { attachedContexts, loading } = useSnapshot(context.state);

  const handleRemoveContext = useCallback((value: string) => {
    context.actions.removeContext(value);
  }, []);

  const contextTags = useMemo(() => {
    return attachedContexts.map((contextItem) =>
      renderContextTag(contextItem, () =>
        handleRemoveContext(contextItem.value),
      ),
    );
  }, [attachedContexts, handleRemoveContext]);

  return (
    <Sender.Header
      closable={false}
      open={true}
      styles={{ content: { padding: 0 } }}
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
