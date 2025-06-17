import { AiContextNodeConfig } from '@/types/chat';

function getTextDiff(prevContext: string, nextContent: string) {
  const diff: string[] = [];
  let i = 0,
    j = 0;

  while (i < prevContext.length || j < nextContent.length) {
    if (
      i < prevContext.length &&
      j < nextContent.length &&
      prevContext[i] === nextContent[j]
    ) {
      i++;
      j++;
    } else {
      if (j < nextContent.length) {
        diff.push(`+${nextContent[j]}`);
        j++;
      }
      if (i < prevContext.length) {
        diff.push(`-${prevContext[i]}`);
        i++;
      }
    }
  }
  return diff;
}

export function isInputingAiContext(prevContext: string, nextContent: string) {
  const diff = getTextDiff(prevContext, nextContent);
  // 本次输入只输入了一个@，代表唤起菜单
  return diff.length === 1 && diff[0] === '+@';
}
