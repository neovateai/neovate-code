import { Sender } from '@ant-design/x';
import { useSnapshot } from '@umijs/max';
import { Flex, Tag } from 'antd';
import { useEffect } from 'react';
import * as context from '@/state/context';
import * as sender from '@/state/sender';

const SenderHeader: React.FC = () => {
  const { contextOpen } = useSnapshot(sender.state);
  const { isShowContext, files } = useSnapshot(context.state);

  useEffect(() => {
    sender.actions.setContextOpen(isShowContext);
  }, [isShowContext]);

  return (
    <Sender.Header
      title="Context"
      open={contextOpen}
      onOpenChange={sender.actions.setContextOpen}
      styles={{ content: { padding: 0 } }}
    >
      <Flex gap={8} wrap="wrap" style={{ padding: 8 }}>
        {files.map((file) => (
          <Tag style={{ userSelect: 'none' }} key={file}>
            {file}
          </Tag>
        ))}
      </Flex>
    </Sender.Header>
  );
};

export default SenderHeader;
