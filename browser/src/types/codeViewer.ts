export interface CodeNormalViewerTabItem {
  id: number;
  title: string;
  language: string;
  code: string;
  viewType: 'normal';
}

export interface CodeDiffViewerTabItem {
  id: number;
  title: string;
  language: string;
  originalCode: string;
  modifiedCode: string;
  viewType: 'diff';
}

export interface CodeNormalViewerMetaInfo {
  size: number;
  lineCount: number;
  charCount: number;
}

export type CodeViewerTabItem = CodeNormalViewerTabItem | CodeDiffViewerTabItem;

export type CodeViewerTool = 'copy';
