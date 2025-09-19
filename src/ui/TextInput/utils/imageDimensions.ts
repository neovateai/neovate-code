/**
 * 获取图片尺寸的工具函数
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * 从 base64 图片数据中获取图片尺寸
 * @param base64Data base64 编码的图片数据
 * @returns 图片尺寸信息
 */
export function getImageDimensions(base64Data: string): ImageDimensions {
  try {
    const buffer = Buffer.from(base64Data, 'base64');

    // PNG 格式
    if (
      buffer[0] === 137 &&
      buffer[1] === 80 &&
      buffer[2] === 78 &&
      buffer[3] === 71
    ) {
      return getPNGDimensions(buffer);
    }

    // JPEG 格式
    if (buffer[0] === 255 && buffer[1] === 216) {
      return getJPEGDimensions(buffer);
    }

    // GIF 格式
    if (buffer[0] === 71 && buffer[1] === 73 && buffer[2] === 70) {
      return getGIFDimensions(buffer);
    }

    // WebP 格式
    if (
      buffer[0] === 82 &&
      buffer[1] === 73 &&
      buffer[2] === 70 &&
      buffer[3] === 70
    ) {
      return getWebPDimensions(buffer);
    }

    // 默认返回 100x100
    return { width: 100, height: 100 };
  } catch {
    return { width: 100, height: 100 };
  }
}

function getPNGDimensions(buffer: Buffer): ImageDimensions {
  if (buffer.length < 24) return { width: 100, height: 100 };

  // PNG IHDR chunk 从第 16 字节开始
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  return { width, height };
}

function getJPEGDimensions(buffer: Buffer): ImageDimensions {
  let offset = 2; // 跳过 FF D8

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break;

    const marker = buffer[offset + 1];

    // SOF0, SOF1, SOF2 标记包含尺寸信息
    if (marker >= 0xc0 && marker <= 0xc3) {
      if (offset + 9 < buffer.length) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
    }

    // 跳过当前段
    if (offset + 3 < buffer.length) {
      const segmentLength = buffer.readUInt16BE(offset + 2);
      offset += 2 + segmentLength;
    } else {
      break;
    }
  }

  return { width: 100, height: 100 };
}

function getGIFDimensions(buffer: Buffer): ImageDimensions {
  if (buffer.length < 10) return { width: 100, height: 100 };

  // GIF 尺寸信息在 6-9 字节
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);

  return { width, height };
}

function getWebPDimensions(buffer: Buffer): ImageDimensions {
  if (buffer.length < 30) return { width: 100, height: 100 };

  // WebP 格式比较复杂，这里简化处理
  // 实际项目中可能需要更复杂的解析
  try {
    // 尝试从 VP8 或 VP8L 块中获取尺寸
    let offset = 12; // 跳过 RIFF 头部

    while (offset < buffer.length - 8) {
      const chunkType = buffer.toString('ascii', offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);

      if (chunkType === 'VP8 ' || chunkType === 'VP8L') {
        // 简化处理，返回默认尺寸
        return { width: 100, height: 100 };
      }

      offset += 8 + chunkSize;
    }
  } catch {
    // 忽略错误
  }

  return { width: 100, height: 100 };
}
