import React from 'react';
import { DiffViewer } from './DiffViewer';
import { useAppStore } from './store';
import { type EditParams, type WriteParams, getDiffParams } from './utils/get-diff-params';


type DiffRendererProps = {
  toolName: 'edit' | 'write';
  params: EditParams | WriteParams;
  result?: Record<string, any>;
};

export function DiffRenderer({ toolName, params, result }: DiffRendererProps) {
  const { cwd } = useAppStore();
  const { originalContent, newContent, fileName } = getDiffParams(
    toolName,
    params,
    cwd,
    result,
  );
  return (
    <DiffViewer
      originalContent={originalContent}
      newContent={newContent}
      fileName={fileName}
    />
  );
};

export type { EditParams, WriteParams };
