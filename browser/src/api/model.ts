export interface FileItem {
  path: string;
  type: 'file' | 'directory';
  name: string;
}

export interface ImageItem {
  /** URL or base64 string */
  src: string;
  mime: string;
}
