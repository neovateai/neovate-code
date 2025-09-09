import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { message } from 'antd';
import { PASTE_COMMAND } from 'lexical';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ContextType } from '@/constants/context';
import * as context from '@/state/context';
import { guessImageMime, imageUrlToBase64 } from '@/utils/context';

const PastePlugin = ({
  onPastingImage,
}: {
  onPastingImage?: (loading: boolean) => void;
}) => {
  const [editor] = useLexicalComposerContext();

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
          context.actions.addContext({
            type: ContextType.IMAGE,
            value: `@Image:[${Date.now()}]`,
            displayText: blob.name,
            context: {
              src: base64String,
              mime: blob.type,
            },
          });
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
            onPastingImage?.(true);

            Promise.all(
              Array.from(imgs).map((img) => {
                return new Promise<void>((resolve) => {
                  const src = img.getAttribute('src');

                  if (src) {
                    const mime = guessImageMime(src);

                    imageUrlToBase64(src).then((base64) => {
                      context.actions.addContext({
                        type: ContextType.IMAGE,
                        value: `@Image:[${Date.now()}]`,
                        displayText: src.split('/').pop() || src,
                        context: {
                          src: base64,
                          mime,
                        },
                      });

                      resolve();
                    });
                  } else {
                    resolve();
                  }
                });
              }),
            ).finally(() => {
              onPastingImage?.(false);
            });
          }
        }
      });

      return true;
    },
    [messageInstance],
  );

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent | undefined) => {
        if (!event) return false;

        // 阻止默认粘贴行为
        event.preventDefault();

        const clipboardItems = event.clipboardData?.items;
        if (!clipboardItems || clipboardItems.length === 0) return false;

        // 只获取第一个项目
        const item = clipboardItems[0];
        // 处理图片
        if (item.type.startsWith('image/')) {
          return handleImage(item);
        }
        // 从HTML中解析可能的img标签
        else if (item.type === 'text/html') {
          return handleHtml(item);
        }
        // 处理文本
        else if (item.type === 'text/plain') {
          return false;
        }
        // 其他类型
        else {
          const errorMsg = t('context.unsupportedType', { type: item.type });
          messageInstance.error(errorMsg);
          console.error(errorMsg);
          return true;
        }
      },
      1,
    );
  }, [editor, messageInstance]);

  return <>{messageContextHolder}</>;
};

export default memo(PastePlugin);
