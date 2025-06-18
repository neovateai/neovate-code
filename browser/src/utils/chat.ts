import type { SuggestionItem } from '@/components/Suggestion';

interface TextDiff {
  content: string;
  type: '+' | '-';
  index: number;
}

/**
 * 获取两个字符串之间的差异
 * @param str1 原始字符串
 * @param str2 新字符串
 * @returns 返回一个字符串数组，每个元素代表一个差异
 * 如果是添加的文本，会以'+'开头
 * 如果是删除的文本，会以'-'开头
 */
function getTextDiff(str1: string, str2: string): TextDiff[] {
  const diffs: TextDiff[] = [];

  // 如果字符串完全相同，直接返回空数组
  if (str1 === str2) {
    return diffs;
  }

  // 找出较长和较短的字符串
  const [shorter, longer] =
    str1.length < str2.length ? [str1, str2] : [str2, str1];
  const isAddition = str1.length < str2.length;

  let i = 0;
  let j = 0;
  let currentDiff = '';

  while (i < longer.length) {
    if (j >= shorter.length || longer[i] !== shorter[j]) {
      // 累积差异字符
      currentDiff += longer[i];
    } else {
      // 如果有累积的差异，添加到结果中
      if (currentDiff) {
        const diff: TextDiff = {
          content: currentDiff,
          type: isAddition ? '+' : '-',
          index: j,
        };

        diffs.push(diff);
        currentDiff = '';
      }
      j++;
    }
    i++;
  }

  // 处理最后可能剩余的差异
  if (currentDiff) {
    const diff: TextDiff = {
      content: currentDiff,
      type: isAddition ? '+' : '-',
      index: j,
    };

    diffs.push(diff);
  }

  return diffs;
}

export function getInputInfo(prevContext: string, nextContent: string) {
  const diffs = getTextDiff(prevContext, nextContent);

  // 本次输入只输入了一个@，代表唤起菜单
  return {
    isInputingAiContext:
      diffs.length === 1 && diffs[0].content === '@' && diffs[0].type === '+',
    position: diffs[0]?.index,
  };
}

export function searchSuggestionItem(
  suggestionItems: SuggestionItem[],
  value: string,
) {
  // dfs
  function dfs(items: SuggestionItem[], value: string): SuggestionItem | null {
    for (const item of items) {
      if (item.value === value) {
        return item;
      }
      if (item.children) {
        const result = dfs(item.children, value);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }

  return dfs(suggestionItems, value);
}
