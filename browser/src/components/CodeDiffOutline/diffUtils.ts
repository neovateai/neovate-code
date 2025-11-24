/**
 * 差异计算工具函数
 * 提供安全的文本差异处理功能
 */

export interface DiffContent {
  readonly oldContent: string;
  readonly newContent: string;
}

/**
 * 安全地计算文件差异内容
 * 处理新建文件和修改文件的不同场景
 *
 * @param oldStr - 原始内容，空字符串表示新建文件
 * @param newStr - 新内容
 * @returns 差异内容对象
 */
export const computeDiffContent = (
  oldStr?: string | null,
  newStr?: string | null,
): DiffContent => {
  try {
    // 简单的输入处理
    const safeOldStr = oldStr ?? '';
    const safeNewStr = newStr ?? '';

    // 基本类型验证
    if (typeof safeOldStr !== 'string' || typeof safeNewStr !== 'string') {
      return { oldContent: '', newContent: '' };
    }

    return {
      oldContent: safeOldStr,
      newContent: safeNewStr,
    };
  } catch (error) {
    console.error('Failed to compute diff content:', error);
    return {
      oldContent: oldStr ?? '',
      newContent: newStr ?? '',
    };
  }
};

/**
 * 验证差异内容是否有效
 */
export const isValidDiffContent = (diff: DiffContent): boolean => {
  return (
    diff &&
    typeof diff.oldContent === 'string' &&
    typeof diff.newContent === 'string'
  );
};

/**
 * 计算差异统计信息
 */
export const getDiffStats = (diff: DiffContent) => {
  if (!isValidDiffContent(diff)) {
    return { isNewFile: false, isDelete: false, hasChanges: false };
  }

  const isNewFile = diff.oldContent === '';
  const isDelete = diff.newContent === '';
  const hasChanges = diff.oldContent !== diff.newContent;

  return { isNewFile, isDelete, hasChanges };
};
