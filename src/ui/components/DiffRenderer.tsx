import React from 'react';
import { useAppContext } from '../AppContext';
import {
  type EditParams,
  type WriteParams,
  getDiffParams,
} from '../utils/get-diff-params';
import DiffViewer from './DiffViewer';

type DiffRendererProps = {
  toolName: 'edit' | 'write';
  params: EditParams | WriteParams;
  result?: Record<string, any>;
};

const DiffRenderer = ({ toolName, params, result }: DiffRendererProps) => {
  const { services } = useAppContext();
  const cwd = services.context.cwd;
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
export default DiffRenderer;
