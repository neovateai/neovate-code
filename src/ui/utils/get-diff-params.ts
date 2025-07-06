import { existsSync, readFileSync } from 'node:fs';
import path from 'path';

interface CommonParams {
  file_path: string;
}

export interface EditParams extends CommonParams {
  old_string: string;
  new_string: string;
}

export interface WriteParams extends CommonParams {
  content: string;
}

interface DiffResult {
  originalContent: string;
  newContent: string;
  fileName: string;
}

function getRelativePath(filePath: string, cwd: string): string {
  return path.isAbsolute(filePath) ? path.relative(cwd, filePath) : filePath;
}

export function getDiffParams(
  toolName: string,
  params: EditParams | WriteParams,
  cwd: string,
): DiffResult {
  const { file_path } = params;
  const relativeFilePath = getRelativePath(file_path, cwd);

  if (toolName === 'edit') {
    const { old_string, new_string } = params as EditParams;
    return {
      originalContent: old_string,
      newContent: new_string,
      fileName: relativeFilePath,
    };
  }
  if (toolName === 'write') {
    const { content, file_path } = params as WriteParams;
    const fullFilePath = path.isAbsolute(file_path)
      ? file_path
      : path.resolve(cwd, file_path);

    try {
      const oldContent = existsSync(fullFilePath)
        ? readFileSync(fullFilePath, 'utf-8')
        : '';
      return {
        originalContent: oldContent,
        newContent: content,
        fileName: relativeFilePath,
      };
    } catch (error) {
      return {
        originalContent: '',
        newContent: content,
        fileName: relativeFilePath,
      };
    }
  }

  throw new Error(`Invalid tool name: ${toolName}`);
}
