export interface FolderItem {
  name: string;
  path: string;
  isPackage: boolean;
  hidden: boolean;
  __typename: 'Folder';
}

export interface FolderResponse {
  name: string;
  path: string;
  isPackage: boolean;
  children: FolderItem[];
  __typename: 'Folder';
}

export interface FolderPickerProps {
  initialPath?: string;
  onFolderChange?: (folderPath: string) => void;
  height?: number | string;
  className?: string;
}

export interface FolderTreeNode {
  key: string;
  title: string;
  path: string;
  isLeaf?: boolean;
  children?: FolderTreeNode[];
  isPackage: boolean;
  hidden: boolean;
  expanded?: boolean;
  loading?: boolean;
}

export interface FolderTreeProps {
  currentPath: string;
  onPathChange: (path: string) => void;
  height?: number | string;
}

export interface FolderItemProps {
  folder: FolderItem;
  onSelect: (path: string) => void;
  isSelected?: boolean;
  level?: number;
}

export interface BreadcrumbProps {
  currentPath: string;
  onPathChange: (path: string) => void;
}

export interface FolderService {
  getFolderContents: (
    path: string,
  ) => Promise<{ success: boolean; data: FolderResponse }>;
}
