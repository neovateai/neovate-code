import { unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import terminalImage from 'terminal-image';

/**
 * 在终端中显示 base64 编码的图片
 * @param base64Image - base64 编码的图片数据（不包含 data:image/... 前缀）
 * @param mimeType - 图片的 MIME 类型，如 'image/png', 'image/jpeg' 等
 * @param options - 显示选项
 * @returns Promise<string> - 返回图片的 ANSI 转义序列字符串
 */
export async function displayImageInTerminal(
  base64Image: string,
  mimeType: string = 'image/png',
  options: {
    width?: number;
    height?: number;
    preserveAspectRatio?: boolean;
  } = {},
): Promise<string> {
  try {
    // 创建临时文件
    const tempFileName = `neovate_image_${Date.now()}.${getFileExtension(mimeType)}`;
    const tempFilePath = join(tmpdir(), tempFileName);

    // 将 base64 数据写入临时文件
    const imageBuffer = Buffer.from(base64Image, 'base64');
    writeFileSync(tempFilePath, imageBuffer);

    try {
      // 使用 terminal-image 显示图片
      const imageString = await terminalImage.file(tempFilePath, {
        width: options.width || 80,
        height: options.height,
        preserveAspectRatio: options.preserveAspectRatio !== false,
      });

      return imageString;
    } finally {
      // 清理临时文件
      try {
        unlinkSync(tempFilePath);
      } catch (error) {
        console.warn('Failed to delete temporary image file:', error);
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to display image in terminal: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * 从 MIME 类型获取文件扩展名
 * @param mimeType - MIME 类型
 * @returns 文件扩展名
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
    'image/tiff': 'tiff',
  };

  return mimeToExt[mimeType] || 'png';
}

/**
 * 从 data URL 中提取 base64 数据和 MIME 类型
 * @param dataUrl - data URL 格式的图片数据
 * @returns 包含 base64 数据和 MIME 类型的对象
 */
export function parseDataUrl(dataUrl: string): {
  base64: string;
  mimeType: string;
} {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URL format');
  }

  return {
    mimeType: match[1],
    base64: match[2],
  };
}

/**
 * 检查终端是否支持图片显示
 * @returns boolean - 是否支持图片显示
 */
export function isImageDisplaySupported(): boolean {
  // 检查是否在支持的终端环境中
  const term = process.env.TERM || '';
  const termProgram = process.env.TERM_PROGRAM || '';

  // 支持 iTerm2, Kitty, 和一些其他现代终端
  const supportedTerms = ['xterm-256color', 'xterm-kitty', 'screen-256color'];
  const supportedPrograms = ['iTerm.app', 'kitty', 'Hyper'];

  return (
    supportedTerms.some((t) => term.includes(t)) ||
    supportedPrograms.some((p) => termProgram.includes(p)) ||
    process.env.COLORTERM === 'truecolor' ||
    process.env.COLORTERM === '24bit'
  );
}
