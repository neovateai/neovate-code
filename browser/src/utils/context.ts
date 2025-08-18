import type { FileItem, ImageItem } from '@/api/model';
import { ContextType } from '@/constants/context';
import type { ContextItem, ContextStoreValue } from '@/types/context';

export async function imageUrlToBase64(url: string) {
  return new Promise<string>((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Get canvas 2d context failed.');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const base64String = canvas.toDataURL('image/png');
      resolve(base64String);
    };

    img.onerror = (e) => {
      console.error('Load image to canvas failed.', e);
    };
  });
}

// 根据图片 src 猜测 mime 类型
export function guessImageMime(src: string): string {
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

export function storeValueToContextItem(
  storeValue: ContextStoreValue,
  type: ContextType,
): ContextItem | null {
  switch (type) {
    case ContextType.FILE:
      return {
        type: ContextType.FILE,
        value: (storeValue as FileItem).path,
        displayText: (storeValue as FileItem).name,
        context: storeValue,
      };

    case ContextType.IMAGE:
      return {
        type: ContextType.IMAGE,
        value: (storeValue as ImageItem).src,
        displayText: 'Image',
        context: storeValue,
      };

    default:
      return null;
  }
}
