import stringWidth from 'string-width';

/**
 * 清理输入文本，移除不支持的字符
 */
export function sanitizeText(str: string): string {
  // 规范化换行符
  const normalized = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return normalized
    .split('')
    .filter((char) => {
      const code = char.codePointAt(0);
      if (code === undefined) return false;

      // 保留更多字符类型
      return (
        // 可打印 ASCII 字符 (32-126)
        (code >= 32 && code <= 126) ||
        // 换行符
        code === 10 ||
        // 制表符
        code === 9 ||
        // Unicode 字符 (大于 127)
        code > 127
      );
    })
    .join('');
}
