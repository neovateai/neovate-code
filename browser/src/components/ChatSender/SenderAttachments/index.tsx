import { CloudUploadOutlined, PaperClipOutlined } from '@ant-design/icons';
import { Attachments } from '@ant-design/x';
import { Button, message } from 'antd';
import type { RcFile } from 'antd/es/upload';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CONTEXT_AVAILABLE_FILE_TYPES,
  CONTEXT_MAX_FILE_SIZE,
  ContextType,
} from '@/constants/context';
import * as context from '@/state/context';

const SenderAttachments = () => {
  // const { attachments } = useSnapshot(state);

  const availableImageTypes = useMemo(
    () =>
      CONTEXT_AVAILABLE_FILE_TYPES.filter((type) =>
        type.mime.startsWith('image/'),
      ),
    [],
  );

  const { t } = useTranslation();

  const [messageApi, contextHolder] = message.useMessage();

  const handleBeforeUpload = (file: RcFile) => {
    if (availableImageTypes.some((type) => file.name.endsWith(type.extName))) {
      // upload image file
      // automatically transform file to image context
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result?.toString();

        if (base64String) {
          context.actions.addContext({
            type: ContextType.IMAGE,
            value: `@Image:[${Date.now()}]`,
            displayText: file.name,
            context: {
              src: base64String,
              mime: file.type,
            },
          });
        }
      };

      reader.onerror = (e) => {
        messageApi.error(t('context.attachments.uploadError'));
        console.error(e);
      };

      reader.readAsDataURL(file);

      return false;
    }

    if (file.size > CONTEXT_MAX_FILE_SIZE) {
      messageApi.error(
        t('context.attachments.fileSizeLimited', {
          limit: `${CONTEXT_MAX_FILE_SIZE / 1024 / 1024}MB`,
        }),
      );
      return false;
    }

    messageApi.error(
      t('context.unsupportedType', {
        type: file.type || file.name.split('.').pop(),
      }),
    );

    // TODO: do not support file besides image
    return false;
  };

  return (
    <>
      <Attachments
        accept={CONTEXT_AVAILABLE_FILE_TYPES.map((type) => type.extName).join(
          ',',
        )}
        beforeUpload={handleBeforeUpload}
        getDropContainer={() => document.body}
        placeholder={{
          icon: <CloudUploadOutlined />,
          title: t('context.attachments.dragFileHere'),
          description: t('context.attachments.supportTypeDesc'),
        }}
      >
        <Button
          type="text"
          icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
        />
      </Attachments>
      {contextHolder}
    </>
  );
};

export default SenderAttachments;
