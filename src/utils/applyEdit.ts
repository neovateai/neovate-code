import * as Diff from 'diff';
import { readFileSync } from 'fs';
import { isAbsolute, resolve } from 'pathe';

export interface Edit {
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

function applyStringReplace(
  content: string,
  oldStr: string,
  newStr: string,
  replaceAll = false,
): string {
  const performReplace = (text: string, search: string, replace: string) => {
    if (replaceAll) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return text.replace(new RegExp(escapedSearch, 'g'), () => replace);
    }
    return text.replace(search, () => replace);
  };

  if (newStr !== '') {
    return performReplace(content, oldStr, newStr);
  }

  const hasTrailingNewline =
    !oldStr.endsWith('\n') && content.includes(oldStr + '\n');

  return hasTrailingNewline
    ? performReplace(content, oldStr + '\n', newStr)
    : performReplace(content, oldStr, newStr);
}

export function applyEdits(
  cwd: string,
  filePath: string,
  edits: Edit[],
): { patch: any; updatedFile: string } {
  const fullFilePath = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);

  let fileContents = '';
  try {
    fileContents = readFileSync(fullFilePath, 'utf-8');
  } catch (error: any) {
    if (
      error.code === 'ENOENT' &&
      edits.length === 1 &&
      edits[0].old_string === ''
    ) {
      fileContents = '';
    } else {
      throw error;
    }
  }

  let currentContent = fileContents;
  const newStringsHistory: string[] = [];

  for (const edit of edits) {
    const { old_string, new_string, replace_all } = edit;

    const oldStrCheck = old_string.replace(/\n+$/, '');
    for (const historyStr of newStringsHistory) {
      if (oldStrCheck !== '' && historyStr.includes(oldStrCheck)) {
        throw new Error(
          `Cannot edit file: old_string is a substring of a new_string from a previous edit.\nOld string: ${old_string}`,
        );
      }
    }

    const previousContent = currentContent;

    if (old_string === '') {
      currentContent = new_string;
    } else {
      currentContent = applyStringReplace(
        currentContent,
        old_string,
        new_string,
        replace_all,
      );
    }

    if (currentContent === previousContent) {
      if (old_string === new_string && old_string !== '') {
        throw new Error(
          'No changes to make: old_string and new_string are exactly the same.',
        );
      }
      throw new Error(
        `String not found in file. Failed to apply edit.\nString: ${old_string}`,
      );
    }

    newStringsHistory.push(new_string);
  }

  if (currentContent === fileContents && edits.length > 0) {
    throw new Error(
      'Original and edited file match exactly. Failed to apply edit.',
    );
  }

  const patch = Diff.structuredPatch(
    filePath,
    filePath,
    fileContents,
    currentContent,
  );

  return { patch, updatedFile: currentContent };
}
