import { FolderOutlined, RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ToolMessage } from '@/types/message';
import { ToolStatus } from '../components/ToolStatus';
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
    if (targetNode && targetNode.children) {
      return targetNode.children;
    }
  }

  return rootItems;
};

export default function LsRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;

  const { state } = message;
  const dirPath = (message.args?.dir_path as string) || '';
  const items = parseLsResult(message.result?.data, dirPath);
  const { t } = useTranslation();

  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = () => {
    if (items.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  let displayPath = dirPath;
  let itemsCount = items.length;

  if (items.length === 1 && items[0].isDirectory) {
    displayPath = items[0].name;
    itemsCount = items[0].children?.length || 0;
  }

  return (
    <div className="text-sm">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={toggleExpand}
      >
        <span
          className={`transition-transform duration-300 ease-in-out ${
            isExpanded ? 'rotate-90' : ''
          }`}
        >
          <RightOutlined />
        </span>
        <FolderOutlined />
        <span className="flex-1">
          {t('toolRenders.ls.listedItems', {
            count: itemsCount,
            path: displayPath.split('/').pop() || displayPath,
          })}
        </span>
        <ToolStatus state={state} />
      </div>
      <div
        className={`px-2 bg-gray-50 mt-1 overflow-y-auto transition-[max-height] duration-500 ease-in-out ${
          isExpanded && items.length > 0 ? 'max-h-40' : 'max-h-0'
        }`}
      >
        <InnerList items={items} showPath={false} />
      </div>
    </div>
  );
}
