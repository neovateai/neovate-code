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
    console.error('Failed to clean HTML styles:', error);
    return html;
  }
};
