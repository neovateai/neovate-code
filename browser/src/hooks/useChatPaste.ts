import { message } from 'antd';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guessImageMime, imageUrlToBase64 } from '@/utils/context';

export function useChatPaste() {
  const [isPasting, setIsPasting] = useState(false);

  const [messageInstance, messageContextHolder] = message.useMessage();

  const { t } = useTranslation();

  const handleImage = useCallback(
    (item: DataTransferItem) => {
      const blob = item.getAsFile();
      if (blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64String = e.target?.result?.toString();
          if (!base64String) {
            return;
          }
          // TODO 实现新增上下文
        };
        reader.readAsDataURL(blob);
      } else {
        messageInstance.error('Load image failed');
      }
      return true;
    },
    [messageInstance],
  );

  const handleHtml = useCallback(
    (item: DataTransferItem) => {
      item.getAsString((html) => {
        if (!html) {
          messageInstance.error('Load html failed');
        } else {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const imgs = doc.querySelectorAll('img');

          if (imgs.length > 0) {
            setIsPasting(true);

            Promise.all(
              Array.from(imgs).map((img) => {
                return new Promise<void>((resolve) => {
                  const src = img.getAttribute('src');

                  if (src) {
                    const mime = guessImageMime(src);

                    imageUrlToBase64(src).then((base64) => {
                      // TODO 实现新增上下文
                      console.log('handleHtml', base64, mime);

                      resolve();
                    });
                  } else {
                    resolve();
                  }
                });
              }),
            ).finally(() => {
              setIsPasting(false);
            });
          }
        }
      });

      return true;
    },
    [messageInstance],
  );

  const handlePaste = (event: React.ClipboardEvent<HTMLElement>) => {
    if (!event) return false;

    // 阻止默认粘贴行为
    event.preventDefault();

    const clipboardItems = event.clipboardData?.items;
    if (!clipboardItems || clipboardItems.length === 0) return false;

    // 只获取第一个项目
    const item = clipboardItems[0];

    switch (item.type) {
      case 'text/plain':
        // 处理纯文本
        return false;
      case 'text/html':
        // 处理HTML
        return handleHtml(item);
      case 'image/png':
      case 'image/jpeg':
      case 'image/gif':
      case 'image/webp':
      case 'image/svg+xml':
        // 处理图片
        return handleImage(item);
      default:
        const errorMsg = t('context.unsupportedType', { type: item.type });
        messageInstance.error(errorMsg);
        console.error(errorMsg);
        return true;
    }
  };

  return {
    isPasting,
    handlePaste,
    contextHolder: messageContextHolder,
  };
}
