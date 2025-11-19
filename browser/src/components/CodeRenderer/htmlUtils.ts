/**
 * HTML样式清理工具
 * 只清理背景色相关样式，保留语法高亮颜色
 */

/**
 * 清理HTML中的背景色样式，保留前景色和其他样式
 * 只移除 background-color 和 background 属性，保留 color 等样式
 */
export const cleanHtmlStyles = (html: string): string => {
  try {
    // 只移除背景相关样式，保留前景色和其他样式
    return html
      .replace(/background-color:[^;"']*;?\s*/gi, '')
      .replace(/background:[^;"']*;?\s*/gi, '')
      .replace(/style=["'](\s*;?\s*)["']/gi, '') // 移除空的style属性
      .replace(/style=["'](\s*;?\s*)*["']/gi, '') // 移除只包含分号和空格的style属性
      .trim();
  } catch (error) {
    return html;
  }
};

/**
 * 批量处理多个HTML字符串的样式清理
 * 适用于需要处理大量代码块的场景
 */
export const batchCleanHtmlStyles = (htmlArray: string[]): string[] => {
  return htmlArray.map((html) => {
    try {
      return cleanHtmlStyles(html);
    } catch (error) {
      return html;
    }
  });
};

/**
 * 检查HTML是否需要样式清理
 * 可用于避免不必要的处理
 */
export const needsStyleCleaning = (html: string): boolean => {
  return /background(?:-color)?:/i.test(html);
};
