// Character code constants for text sanitization
const PRINTABLE_ASCII_START = 32;
const PRINTABLE_ASCII_END = 126;
const NEWLINE_CODE = 10;
const TAB_CODE = 9;
const UNICODE_START = 127;

/**
 * 清理输入文本，移除不支持的字符
 */
export function sanitizeText(str: string): string {
  if (!str || typeof str !== 'string') return '';

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
        (code >= PRINTABLE_ASCII_START && code <= PRINTABLE_ASCII_END) ||
        // 换行符
        code === NEWLINE_CODE ||
        // 制表符
        code === TAB_CODE ||
        // Unicode 字符 (大于 127)
        code > UNICODE_START
      );
    })
    .join('');
}
