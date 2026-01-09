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

/**
 * Calculate Levenshtein distance between two strings
 * Used for similarity calculation in BlockAnchorReplacer
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Try line-trimmed matching: ignore leading/trailing whitespace on each line
 * Solves indentation difference issues
 * Returns null if multiple matches found to avoid ambiguity
 */
function tryLineTrimmedMatch(content: string, oldStr: string): string | null {
  const contentLines = content.split('\n');
  const searchLines = oldStr.split('\n');
  const matches: string[] = [];

  for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
    let isMatch = true;
    for (let j = 0; j < searchLines.length; j++) {
      if (contentLines[i + j].trim() !== searchLines[j].trim()) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      const matchedLines = contentLines.slice(i, i + searchLines.length);
      matches.push(matchedLines.join('\n'));
    }
  }

  if (matches.length === 1) {
    return matches[0];
  }

  return null;
}

/**
 * Try block anchor matching: use first/last lines as anchors + Levenshtein similarity
 * Solves code blocks with slight modifications in middle lines
 * Requires at least 3 lines
 *
 * Similarity thresholds:
 * - Single candidate: 0.0 (more lenient)
 * - Multiple candidates: 0.3 (more strict)
 */
function tryBlockAnchorMatch(content: string, oldStr: string): string | null {
  const SINGLE_CANDIDATE_SIMILARITY_THRESHOLD = 0.5;
  const MULTIPLE_CANDIDATES_SIMILARITY_THRESHOLD = 0.3;

  const contentLines = content.split('\n');
  const searchLines = oldStr.split('\n');

  // Require at least 3 lines for this strategy
  if (searchLines.length < 3) {
    return null;
  }

  const firstLine = searchLines[0].trim();
  const lastLine = searchLines[searchLines.length - 1].trim();

  // Collect all candidates where first and last lines match
  const candidates: Array<{ startLine: number; endLine: number }> = [];

  for (let i = 0; i < contentLines.length; i++) {
    if (contentLines[i].trim() !== firstLine) continue;

    for (let j = i + 2; j < contentLines.length; j++) {
      if (contentLines[j].trim() === lastLine) {
        candidates.push({ startLine: i, endLine: j });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Helper function to calculate similarity for a candidate
  const calculateSimilarity = (candidate: {
    startLine: number;
    endLine: number;
  }): number => {
    const blockSize = candidate.endLine - candidate.startLine + 1;
    const middleLines = Math.min(blockSize - 2, searchLines.length - 2);

    if (middleLines <= 0) return 1.0; // Only first and last lines, already matched

    let totalSimilarity = 0;

    for (let k = 1; k <= middleLines; k++) {
      const contentLine = contentLines[candidate.startLine + k];
      const searchLine = searchLines[k];
      const maxLen = Math.max(contentLine.length, searchLine.length);

      if (maxLen === 0) {
        totalSimilarity += 1.0;
      } else {
        const distance = levenshtein(contentLine, searchLine);
        totalSimilarity += 1 - distance / maxLen;
      }
    }

    return totalSimilarity / middleLines;
  };

  // Single candidate scenario - use more lenient threshold
  if (candidates.length === 1) {
    const candidate = candidates[0];
    const similarity = calculateSimilarity(candidate);

    if (similarity >= SINGLE_CANDIDATE_SIMILARITY_THRESHOLD) {
      const matchedLines = contentLines.slice(
        candidate.startLine,
        candidate.endLine + 1,
      );
      return matchedLines.join('\n');
    }

    return null;
  }

  // Multiple candidates scenario - find best match above threshold
  let bestMatch: string | null = null;
  let maxSimilarity = -1;

  for (const candidate of candidates) {
    const similarity = calculateSimilarity(candidate);

    if (
      similarity > maxSimilarity &&
      similarity >= MULTIPLE_CANDIDATES_SIMILARITY_THRESHOLD
    ) {
      maxSimilarity = similarity;
      const matchedLines = contentLines.slice(
        candidate.startLine,
        candidate.endLine + 1,
      );
      bestMatch = matchedLines.join('\n');
    }
  }

  return bestMatch;
}

/**
 * Try whitespace-normalized matching: replace all consecutive whitespace with single space
 * Solves extra spaces and tab mixing issues
 * Returns null if multiple matches found to avoid ambiguity
 */
function tryWhitespaceNormalizedMatch(
  content: string,
  oldStr: string,
): string | null {
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
  const normalizedOld = normalize(oldStr);
  const lines = content.split('\n');
  const matches: string[] = [];

  // Single-line matching
  for (const line of lines) {
    if (normalize(line) === normalizedOld) {
      matches.push(line);
    }
  }

  if (matches.length === 1) {
    return matches[0];
  }

  // Multi-line matching
  const oldLines = oldStr.split('\n');
  if (oldLines.length > 1) {
    const multiLineMatches: string[] = [];
    for (let i = 0; i <= lines.length - oldLines.length; i++) {
      const block = lines.slice(i, i + oldLines.length).join('\n');
      if (normalize(block) === normalizedOld) {
        multiLineMatches.push(block);
      }
    }
    if (multiLineMatches.length === 1) {
      return multiLineMatches[0];
    }
  }

  return null;
}

/**
 * Unescape string (handle LLM over-escaping issues)
 * Reference: unescapeStringForGeminiBug in edit-logic-analysis.md
 */
function unescapeStringForGeminiBug(inputString: string): string {
  return inputString.replace(
    /\\+(n|t|r|'|"|`|\\|\n)/g,
    (match, capturedChar) => {
      switch (capturedChar) {
        case 'n':
          return '\n';
        case 't':
          return '\t';
        case 'r':
          return '\r';
        case "'":
          return "'";
        case '"':
          return '"';
        case '`':
          return '`';
        case '\\':
          return '\\';
        case '\n':
          return '\n';
        default:
          return match;
      }
    },
  );
}

/**
 * Try escape-normalized matching: handle over-escaped strings
 * Solves LLM-generated \\n, \\t escape issues
 */
function tryEscapeNormalizedMatch(
  content: string,
  oldStr: string,
): string | null {
  const unescaped = unescapeStringForGeminiBug(oldStr);

  // Direct matching
  if (content.includes(unescaped)) {
    return unescaped;
  }

  // Multi-line block matching
  const lines = content.split('\n');
  const unescapedLines = unescaped.split('\n');

  if (unescapedLines.length > 1) {
    for (let i = 0; i <= lines.length - unescapedLines.length; i++) {
      const block = lines.slice(i, i + unescapedLines.length).join('\n');
      if (unescapeStringForGeminiBug(block) === unescaped) {
        return block;
      }
    }
  }

  return null;
}

/**
 * Remove common indentation from text
 */
function removeCommonIndentation(text: string): string {
  const lines = text.split('\n');
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length === 0) return text;

  // Find minimum indentation
  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    }),
  );

  // Remove minimum common indentation
  return lines
    .map((line) => (line.trim().length === 0 ? line : line.slice(minIndent)))
    .join('\n');
}

/**
 * Try indentation-flexible matching: ignore overall indentation level differences
 * Solves code block movement to different indentation levels
 * Returns null if multiple matches found to avoid ambiguity
 */
function tryIndentationFlexibleMatch(
  content: string,
  oldStr: string,
): string | null {
  const normalizedSearch = removeCommonIndentation(oldStr);
  const contentLines = content.split('\n');
  const searchLines = oldStr.split('\n');
  const matches: string[] = [];

  for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
    const block = contentLines.slice(i, i + searchLines.length).join('\n');
    if (removeCommonIndentation(block) === normalizedSearch) {
      matches.push(block);
    }
  }

  if (matches.length === 1) {
    return matches[0];
  }

  return null;
}

/**
 * Apply string replacement using multiple strategies to improve match success rate
 * Strategies are tried in priority order, using the first successful one
 *
 * Strategy chain (in priority order):
 * 1. Exact match
 * 2. Line-trimmed match (ignoring indentation)
 * 3. Block anchor match (using first/last lines + similarity)
 * 4. Whitespace-normalized match (handling extra spaces)
 * 5. Escape-normalized match (handling over-escaping)
 * 6. Indentation-flexible match (ignoring base indentation level)
 *
 * Note: If a strategy finds multiple matches and replace_all=false,
 * it will continue to the next more precise strategy (but current implementation
 * performs replacement directly, as subsequent strategies typically find the same
 * or more matches)
 */
function applyStringReplace(
  content: string,
  oldStr: string,
  newStr: string,
  replaceAll = false,
): { result: string; matchIndex: number } {
  const performReplace = (
    text: string,
    search: string,
    replace: string,
    matchIdx: number,
  ): { result: string; matchIndex: number } => {
    if (replaceAll) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return {
        result: text.replace(new RegExp(escapedSearch, 'g'), () => replace),
        matchIndex: matchIdx,
      };
    }
    return {
      result: text.replace(search, () => replace),
      matchIndex: matchIdx,
    };
  };

  // Strategy 1: Exact match
  if (content.includes(oldStr)) {
    const matchIndex = content.indexOf(oldStr);
    if (newStr !== '') {
      return performReplace(content, oldStr, newStr, matchIndex);
    }

    const hasTrailingNewline =
      !oldStr.endsWith('\n') && content.includes(`${oldStr}\n`);

    return hasTrailingNewline
      ? performReplace(content, `${oldStr}\n`, newStr, matchIndex)
      : performReplace(content, oldStr, newStr, matchIndex);
  }

  // Strategy 2: Line-trimmed match
  const lineTrimmedMatch = tryLineTrimmedMatch(content, oldStr);
  if (lineTrimmedMatch) {
    const matchIndex = content.indexOf(lineTrimmedMatch);
    return performReplace(content, lineTrimmedMatch, newStr, matchIndex);
  }

  // Strategy 3: Block anchor match (first/last lines + similarity)
  const blockAnchorMatch = tryBlockAnchorMatch(content, oldStr);
  if (blockAnchorMatch) {
    const matchIndex = content.indexOf(blockAnchorMatch);
    return performReplace(content, blockAnchorMatch, newStr, matchIndex);
  }

  // Strategy 4: Whitespace-normalized match
  const whitespaceMatch = tryWhitespaceNormalizedMatch(content, oldStr);
  if (whitespaceMatch) {
    const matchIndex = content.indexOf(whitespaceMatch);
    return performReplace(content, whitespaceMatch, newStr, matchIndex);
  }

  // Strategy 5: Escape-normalized match
  const escapeMatch = tryEscapeNormalizedMatch(content, oldStr);
  if (escapeMatch) {
    const matchIndex = content.indexOf(escapeMatch);
    return performReplace(content, escapeMatch, newStr, matchIndex);
  }

  // Strategy 6: Indentation-flexible match
  const indentMatch = tryIndentationFlexibleMatch(content, oldStr);
  if (indentMatch) {
    const matchIndex = content.indexOf(indentMatch);
    return performReplace(content, indentMatch, newStr, matchIndex);
  }

  // All strategies failed
  const truncatedOldStr =
    oldStr.length > 200 ? `${oldStr.substring(0, 200)}...` : oldStr;

  throw new Error(
    `The string to be replaced was not found in the file. Please ensure the 'old_string' matches the file content exactly, including indentation and whitespace.\nTarget string (first 200 chars): ${truncatedOldStr}`,
  );
}

export function applyEdits(
  cwd: string,
  filePath: string,
  edits: Edit[],
): { patch: any; updatedFile: string; startLineNumber: number } {
  const fullFilePath = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);

  let fileContents = '';
  try {
    fileContents = readFileSync(fullFilePath, 'utf-8');
    // Normalize line endings: CRLF → LF
    fileContents = fileContents.replace(/\r\n/g, '\n');
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
  let firstMatchLineNumber = 1;

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
      firstMatchLineNumber = 1;
    } else {
      const { result, matchIndex } = applyStringReplace(
        currentContent,
        old_string,
        new_string,
        replace_all,
      );
      currentContent = result;
      if (firstMatchLineNumber === 1 && matchIndex >= 0) {
        const textBeforeMatch = previousContent.substring(0, matchIndex);
        firstMatchLineNumber = textBeforeMatch.split('\n').length;
      }
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

  return {
    patch,
    updatedFile: currentContent,
    startLineNumber: firstMatchLineNumber,
  };
}
