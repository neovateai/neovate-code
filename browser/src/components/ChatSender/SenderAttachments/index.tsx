import { CloudUploadOutlined, PaperClipOutlined } from '@ant-design/icons';
import { Attachments } from '@ant-design/x';
import { Button, message } from 'antd';
import {
  CONTEXT_AVAILABLE_FILE_TYPES,
  CONTEXT_MAX_FILE_SIZE,
  ContextType,
} from '@/constants/context';
import { actions } from '@/state/context';

const SenderAttachments = () => {
  // const { attachments } = useSnapshot(state);

  return (
    <Attachments
      // action="/api/upload"

      accept={CONTEXT_AVAILABLE_FILE_TYPES.map((type) => type.extName).join(
        ',',
      )}
      beforeUpload={(file) => {
        if (file.size > CONTEXT_MAX_FILE_SIZE) {
          message.error(
            `文件大小超出${CONTEXT_MAX_FILE_SIZE / 1024 / 1024}MB限制`,
          );
          return false;
        }

        // TODO Check
        return false;
      }}
      onChange={({ file }) => {
        // TODO server is not ready, so the file status won't be [done]
        if (file.status === 'done') {
          actions.addContext({
            value: file.uid,
            displayText: file.name,
            type: ContextType.ATTACHMENT,
            context: file,
          });
        }
      }}
      getDropContainer={() => document.body}
      placeholder={{
        icon: <CloudUploadOutlined />,
        title: '拖拽文件到这里上传',
        description: '支持上传图片、文本文件',
      }}
    >
      <Button
        type="text"
        icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
      />
    </Attachments>
  );
};

export default SenderAttachments;
