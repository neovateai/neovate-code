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
  includeMetadata?: number;
  /** 最多返回的文件/目录数量 */
  maxSize?: number;
  /** 模糊搜索字符串 */
  searchString?: string;
}
