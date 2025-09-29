import { readFileSync, writeFileSync } from 'fs';
import { isAbsolute, resolve } from 'pathe';
import type { Config } from '../config';

function detectFileEncoding(filePath: string): BufferEncoding {
  return 'utf-8';
}

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

function getPatch(options: {
  filePath: string;
  fileContents: string;
  oldStr: string;
  newStr: string;
}): Hunk[] {
  const lines = options.newStr.split('\n').map((line) => '+' + line);
  return [
    {
      oldStart: 1,
      oldLines: options.oldStr.split('\n').length,
      newStart: 1,
      newLines: options.newStr.split('\n').length,
      lines,
    },
  ];
}

export function applyEdit(
  cwd: string,
  file_path: string,
  old_string: string,
  new_string: string,
  mode: 'search-replace' | 'whole-file' = 'search-replace',
): { patch: Hunk[]; updatedFile: string } {
  const fullFilePath = isAbsolute(file_path)
    ? file_path
    : resolve(cwd, file_path);

  let originalFile;
  let updatedFile;

  if (mode === 'whole-file') {
    // In whole-file mode, we directly use the new content
    originalFile =
      old_string === ''
        ? ''
        : readFileSync(fullFilePath, detectFileEncoding(fullFilePath));
    updatedFile = new_string;
  } else {
    if (old_string === '') {
      originalFile = '';
      updatedFile = new_string;
    } else {
      const enc = detectFileEncoding(fullFilePath);
      originalFile = readFileSync(fullFilePath, enc);
      updatedFile = originalFile.replace(old_string, () => new_string);
    }
  }

  if (updatedFile === originalFile) {
    throw new Error(
      `Original and edited file match exactly. Failed to apply edit. ${JSON.stringify(
        {
          file_path,
          old_string,
          new_string,
        },
      )}`,
    );
  }

  const patch = getPatch({
    filePath: file_path,
    fileContents: originalFile,
    oldStr: originalFile,
    newStr: updatedFile,
  });

  return { patch, updatedFile };
}
