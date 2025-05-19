import { readFileSync, writeFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';
import { Config } from '../config';

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
  mode: Config['editMode'] = 'search-replace',
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
    // In search-replace mode, we use the existing logic
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
      'Original and edited file match exactly. Failed to apply edit.',
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
