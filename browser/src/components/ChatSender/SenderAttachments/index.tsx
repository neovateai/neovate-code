import { CloudUploadOutlined, PaperClipOutlined } from '@ant-design/icons';
import { Attachments } from '@ant-design/x';
import { Button, message } from 'antd';
import {
  CONTEXT_AVAILABLE_FILE_TYPES,
  CONTEXT_MAX_FILE_SIZE,
} from '@/constants/context';

const SenderAttachments = () => {
  return (
    <Attachments
      action="/api/upload"
      accept={CONTEXT_AVAILABLE_FILE_TYPES.map((type) => type.extName).join(
        ',',
      )}
      beforeUpload={(file) => {
        console.log(file, 'beforeUpload');

        if (file.size > CONTEXT_MAX_FILE_SIZE) {
          message.error(
            `文件大小超出${CONTEXT_MAX_FILE_SIZE / 1024 / 1024}MB限制`,
          );
          return;
        }

        // TODO Check
        return false;
      }}
      onChange={(file) => {
        // TODO 如果文件来自项目中，则直接添加项目中的文件到上下文
        console.log(file);
      }}
      getDropContainer={() => document.body}
      placeholder={{
        icon: <CloudUploadOutlined />,
        title: '拖拽文件到这里上传',
        description: '支持上传图片、Figma文档、文本文件',
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
