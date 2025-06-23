import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { message } from 'antd';
import * as cheerio from 'cheerio';
import { PASTE_COMMAND } from 'lexical';
import { useCallback, useEffect } from 'react';
import { ContextType } from '@/constants/context';
import * as context from '@/state/context';

// 根据图片 src 猜测 mime 类型
function guessImageMime(src: string): string {
  if (src.startsWith('data:')) {
    const match = src.match(/^data:(image\/[a-zA-Z0-9.+-]+)[;,]/);
    if (match) return match[1];
  } else if (src.endsWith('.jpg') || src.endsWith('.jpeg')) {
    return 'image/jpeg';
  } else if (src.endsWith('.png')) {
    return 'image/png';
  } else if (src.endsWith('.gif')) {
    return 'image/gif';
  } else if (src.endsWith('.webp')) {
    return 'image/webp';
  } else if (src.endsWith('.svg')) {
    return 'image/svg+xml';
  }
  return 'image/png';
}

const PastePlugin = () => {
  const [editor] = useLexicalComposerContext();

  const [messageInstance, messageContextHolder] = message.useMessage();

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
          const timeStampStr = Date.now().toString();
          context.actions.addContext({
            type: ContextType.IMAGE,
            value: `@Image:[${timeStampStr}]`,
            displayText: timeStampStr,
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
          const $ = cheerio.load(html);
          const imgTags = $('img');
          if (imgTags.length > 0) {
            imgTags.each((_index, img) => {
              const src = $(img).attr('src');
              if (src) {
                console.log('图片的 src:', src);
                // TODO Add picture to context
                const mime = guessImageMime(src);
                const timeStampStr = Date.now().toString();
                context.actions.addContext({
                  type: ContextType.IMAGE,
                  value: `@Image:[${timeStampStr}]`,
                  displayText: timeStampStr,
                  context: {
                    src,
                    mime,
                  },
                });
              }
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
          const errorMsg = `Unsupported file type: ${item.type}`;
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

export default PastePlugin;
