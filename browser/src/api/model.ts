export interface FileItem {
  path: string;
  type: 'file' | 'directory';
  name: string;
}

export type ContextStoreValue = FileItem;
