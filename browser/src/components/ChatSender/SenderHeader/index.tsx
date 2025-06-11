import { CloudUploadOutlined } from '@ant-design/icons';
import { Attachments, Sender } from '@ant-design/x';
import { useModel } from '@umijs/max';

const SenderHeader: React.FC = () => {
  const {
    attachmentsOpen,
    setAttachmentsOpen,
    attachedFiles,
    setAttachedFiles,
  } = useModel('sender');

  return (
    <Sender.Header
      title="Upload File"
      open={attachmentsOpen}
      onOpenChange={setAttachmentsOpen}
      styles={{ content: { padding: 0 } }}
    >
      <Attachments
        beforeUpload={() => false}
        items={attachedFiles}
        onChange={(info) => setAttachedFiles(info.fileList)}
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
