import { CloudUploadOutlined } from '@ant-design/icons';
import { Attachments, Sender } from '@ant-design/x';
import { Attachment } from '@ant-design/x/es/attachments';
import { useSnapshot } from '@umijs/max';
import { actions, state } from '@/state/sender';

const SenderHeader: React.FC = () => {
  const { attachmentsOpen, attachedFiles } = useSnapshot(state);

  return (
    <Sender.Header
      title="Upload File"
      open={attachmentsOpen}
      onOpenChange={actions.setAttachmentsOpen}
      styles={{ content: { padding: 0 } }}
    >
      <Attachments
        beforeUpload={() => false}
        items={attachedFiles as Attachment[]}
        onChange={(info) => actions.setAttachedFiles(info.fileList)}
        placeholder={(type) =>
          type === 'drop'
            ? { title: 'Drop file here' }
            : {
                icon: <CloudUploadOutlined />,
                title: 'Upload files',
                description: 'Click or drag files to this area to upload',
              }
        }
      />
    </Sender.Header>
  );
};

export default SenderHeader;
