import MessageWrapper from '@/components/MessageWrapper';
import FolderIcon from '@/icons/folder.svg?react';
import type { UIToolPart } from '@/types/chat';
import InnerList, { type ListItem } from './InnerList';

// Find the node by targetPath in the tree structure
const findNodeByPath = (
  items: ListItem[],
  targetPath: string,
  currentPath: string = '',
): ListItem | null => {
  for (const item of items) {
    // Concatenate the current path
    const fullPath = currentPath ? `${currentPath}/${item.name}` : item.name;

    // Check if the full path matches the target path
    if (fullPath === targetPath) {
      return item;
    }

    // If the current item is a directory and the target path starts with the current path, continue searching recursively
    if (item.children && targetPath.startsWith(fullPath + '/')) {
      const found = findNodeByPath(item.children, targetPath, fullPath);
      if (found) return found;
    }
  }
  return null;
};

const parseLsResult = (result: unknown, parentPath: string): ListItem[] => {
  if (typeof result !== 'string' || !result) return [];

  const lines = result.trim().split('\n');
  const rootItems: ListItem[] = [];
  const parentStack: ListItem[] = [];

  // Edge case for single line path from original code.
  if (lines.length === 1 && !lines[0].trim().startsWith('- ')) {
    const name = lines[0].trim();
    return [
      {
        name: name.endsWith('/') ? name.slice(0, -1) : name,
        isDirectory: name.endsWith('/'),
      },
    ];
  }

  lines.forEach((line) => {
    const match = line.match(/^(\s*)- (.*)/);
    if (!match) return;

    const indentation = match[1].length;
    const level = Math.floor(indentation / 2);

    let name = match[2];
    const isDirectory = name.endsWith('/');
    if (isDirectory) {
      name = name.slice(0, -1);
    }

    const newItem: ListItem = {
      name,
      isDirectory,
      children: isDirectory ? [] : undefined,
    };

    while (parentStack.length > level) {
      parentStack.pop();
    }

    if (parentStack.length === 0) {
      rootItems.push(newItem);
    } else {
      const parent = parentStack[parentStack.length - 1];
      parent.children?.push(newItem);
    }

    if (newItem.isDirectory) {
      parentStack.push(newItem);
    }
  });

  // flatten rootItems, remove parentPath from the result
  if (parentPath && rootItems.length > 0) {
    // find the target node by full parentPath
    const targetNode = findNodeByPath(rootItems, parentPath);
    if (targetNode && targetNode?.children) {
      return targetNode.children;
    }
  }

  return rootItems;
};

export default function LsRender({ part }: { part: UIToolPart }) {
  const dirPath = (part.input?.dir_path as string) || '';
  const items = parseLsResult(part.result?.llmContent, dirPath);

  return (
    <MessageWrapper title={dirPath} icon={<FolderIcon />}>
      <InnerList items={items} showPath={false} />
    </MessageWrapper>
  );
}
