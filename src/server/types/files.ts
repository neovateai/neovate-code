export interface FileItem {
  path: string;
  type: 'file' | 'directory';
  name: string;
  metadata?: {
    size: number;
    lastModified: string;
    isHidden: boolean;
  };
}

export interface FileListRequest {
  directory?: string;
  pattern?: string;
  maxDepth?: number;
  includeMetadata?: number;
}
