import crypto from 'crypto';
import { createTwoFilesPatch } from 'diff';
import { Box, Text } from 'ink';
import type React from 'react';
import { useMemo } from 'react';

interface DiffProps {
  originalContent: string;
  newContent: string;
  fileName?: string;
  maxHeight?: number;
  terminalWidth?: number;
}

interface DiffLine {
  type: 'add' | 'del' | 'context' | 'hunk' | 'other';
  oldLine?: number;
  newLine?: number;
  content: string;
}

interface DiffStats {
  linesAdded: number;
  linesRemoved: number;
}

const DEFAULT_TAB_WIDTH = 4;
const DEFAULT_TERMINAL_WIDTH = 80;
const DEFAULT_MAX_HEIGHT = 20;
const MAX_CONTEXT_LINES_WITHOUT_GAP = 5;

function generateFileDiff(
  originalContent: string,
  newContent: string,
  filePath: string,
): string {
  return createTwoFilesPatch(
    `${filePath} (original)`,
    `${filePath} (modified)`,
    originalContent,
    newContent,
    undefined,
    undefined,
    { context: 3 },
  );
}

function calculateStatsFromParsedLines(parsedLines: DiffLine[]): DiffStats {
  let linesAdded = 0;
  let linesRemoved = 0;

  for (const line of parsedLines) {
    if (line.type === 'add') {
      linesAdded += 1;
    } else if (line.type === 'del') {
      linesRemoved += 1;
    }
  }

  return { linesAdded, linesRemoved };
}

function parseDiffWithLineNumbers(diffContent: string): DiffLine[] {
  const lines = diffContent.split('\n');
  const result: DiffLine[] = [];
  let currentOldLine = 0;
  let currentNewLine = 0;
  let inHunk = false;
  const hunkHeaderRegex = /^@@ -(\d+),?\d* \+(\d+),?\d* @@/;

  for (const line of lines) {
    const hunkMatch = line.match(hunkHeaderRegex);
    if (hunkMatch) {
      currentOldLine = parseInt(hunkMatch[1], 10);
      currentNewLine = parseInt(hunkMatch[2], 10);
      inHunk = true;
      result.push({ type: 'hunk', content: line });
      currentOldLine--;
      currentNewLine--;
      continue;
    }
    if (!inHunk) {
      if (
        line.startsWith('--- ') ||
        line.startsWith('+++ ') ||
        line.startsWith('diff --git') ||
        line.startsWith('index ') ||
        line.startsWith('similarity index') ||
        line.startsWith('rename from') ||
        line.startsWith('rename to') ||
        line.startsWith('new file mode') ||
        line.startsWith('deleted file mode')
      )
        continue;
      continue;
    }
    if (line.startsWith('+')) {
      currentNewLine++;
      result.push({
        type: 'add',
        newLine: currentNewLine,
        content: line.substring(1),
      });
    } else if (line.startsWith('-')) {
      currentOldLine++;
      result.push({
        type: 'del',
        oldLine: currentOldLine,
        content: line.substring(1),
      });
    } else if (line.startsWith(' ')) {
      currentOldLine++;
      currentNewLine++;
      result.push({
        type: 'context',
        oldLine: currentOldLine,
        newLine: currentNewLine,
        content: line.substring(1),
      });
    } else if (line.startsWith('\\')) {
      result.push({ type: 'other', content: line });
    }
  }
  return result;
}

function generateDiffLines(
  originalContent: string,
  newContent: string,
  filePath: string = 'file',
): DiffLine[] {
  if (originalContent === newContent) {
    return [];
  }

  const diffContent = generateFileDiff(originalContent, newContent, filePath);
  return parseDiffWithLineNumbers(diffContent);
}

function isNewFile(parsedLines: DiffLine[]): boolean {
  return parsedLines.every(
    (line) =>
      line.type === 'add' ||
      line.type === 'hunk' ||
      line.type === 'other' ||
      line.content.startsWith('diff --git') ||
      line.content.startsWith('new file mode'),
  );
}

function RenderNewFileContent(
  parsedLines: DiffLine[],
  fileName: string | undefined,
  terminalWidth: number,
): React.ReactNode {
  const addedContent = parsedLines
    .filter((line) => line.type === 'add')
    .map((line) => line.content)
    .join('\n');

  const lines = addedContent.split('\n');

  return (
    <Box
      flexDirection="column"
      width={Math.min(terminalWidth, DEFAULT_TERMINAL_WIDTH)}
    >
      {fileName && (
        <Box paddingX={1} justifyContent="space-between">
          <Box>
            <Text bold color="cyan">
              {fileName}
            </Text>
            <Text color="green"> (new file)</Text>
          </Box>
        </Box>
      )}

      <Box flexDirection="column">
        {lines.map((line, index) => (
          <Box key={index}>
            <Text color="gray">{(index + 1).toString().padStart(4)} </Text>
            <Text color="green">+ </Text>
            <Text color="green">{line}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function RenderDiffContent(
  parsedLines: DiffLine[],
  fileName: string | undefined,
  maxHeight: number,
  terminalWidth: number,
): React.ReactNode {
  const normalizedLines = parsedLines.map((line) => ({
    ...line,
    content: line.content.replace(/\t/g, ' '.repeat(DEFAULT_TAB_WIDTH)),
  }));

  const displayableLines = normalizedLines.filter(
    (l) => l.type !== 'hunk' && l.type !== 'other',
  );

  if (displayableLines.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No changes detected.</Text>
      </Box>
    );
  }

  let baseIndentation = Infinity;
  for (const line of displayableLines) {
    if (line.content.trim() === '') continue;
    const firstCharIndex = line.content.search(/\S/);
    const currentIndent = firstCharIndex === -1 ? 0 : firstCharIndex;
    baseIndentation = Math.min(baseIndentation, currentIndent);
  }
  if (!isFinite(baseIndentation)) {
    baseIndentation = 0;
  }

  const stats = calculateStatsFromParsedLines(parsedLines);

  const key = fileName
    ? `diff-box-${fileName}`
    : `diff-box-${crypto.createHash('sha1').update(JSON.stringify(parsedLines)).digest('hex')}`;

  let lastLineNumber: number | null = null;
  const visibleLines = displayableLines.slice(0, maxHeight - 2); // Reserve space for header and potential truncation message
  const hasMoreLines = displayableLines.length > visibleLines.length;

  const renderLines = useMemo(() => {
    const { linesAdded, linesRemoved } = stats;
    if (!linesAdded && !linesRemoved) return null;

    const addedText = linesAdded ? (
      <Text color="green">+{linesAdded}</Text>
    ) : null;

    const removedText = linesRemoved ? (
      <Text color="red">-{linesRemoved}</Text>
    ) : null;

    return (
      <Text>
        {' '}
        ({addedText}
        {addedText && removedText ? ' ' : null}
        {removedText})
      </Text>
    );
  }, [stats.linesAdded, stats.linesRemoved]);

  return (
    <Box
      key={key}
      paddingX={1}
      flexDirection="column"
      width={Math.min(terminalWidth, DEFAULT_TERMINAL_WIDTH)}
    >
      {fileName && (
        <Box paddingX={1} justifyContent="space-between">
          <Box>
            <Text bold color="cyan">
              {fileName}
            </Text>
            <Text>{renderLines}</Text>
          </Box>
        </Box>
      )}

      <Box flexDirection="column">
        {visibleLines.reduce<React.ReactNode[]>((acc, line, index) => {
          let relevantLineNumberForGapCalc: number | null = null;
          if (line.type === 'add' || line.type === 'context') {
            relevantLineNumberForGapCalc = line.newLine ?? null;
          } else if (line.type === 'del') {
            relevantLineNumberForGapCalc = line.oldLine ?? null;
          }

          if (
            lastLineNumber !== null &&
            relevantLineNumberForGapCalc !== null &&
            relevantLineNumberForGapCalc >
              lastLineNumber + MAX_CONTEXT_LINES_WITHOUT_GAP + 1
          ) {
            acc.push(
              <Box key={`gap-${index}`}>
                <Text>{'═'.repeat(Math.min(terminalWidth - 4, 60))}</Text>
              </Box>,
            );
          }

          const lineKey = `diff-line-${index}`;
          let gutterNumStr = '';
          let color: 'green' | 'red' | undefined;
          let prefixSymbol = ' ';
          let dim = false;

          switch (line.type) {
            case 'add':
              gutterNumStr = (line.newLine ?? '').toString();
              color = 'green';
              prefixSymbol = '+';
              lastLineNumber = line.newLine ?? null;
              break;
            case 'del':
              gutterNumStr = (line.oldLine ?? '').toString();
              color = 'red';
              prefixSymbol = '-';
              if (line.oldLine !== undefined) {
                lastLineNumber = line.oldLine;
              }
              break;
            case 'context':
              gutterNumStr = (line.newLine ?? '').toString();
              dim = true;
              prefixSymbol = ' ';
              lastLineNumber = line.newLine ?? null;
              break;
            default:
              return acc;
          }

          const displayContent = line.content.substring(baseIndentation);

          acc.push(
            <Box key={lineKey}>
              <Text color="gray">{gutterNumStr.padEnd(4)} </Text>
              <Text color={color} dimColor={dim}>
                {prefixSymbol}{' '}
              </Text>
              <Text color={color} dimColor={dim}>
                {displayContent}
              </Text>
            </Box>,
          );
          return acc;
        }, [])}

        {hasMoreLines && (
          <Box>
            <Text color="gray">
              ... {displayableLines.length - visibleLines.length} more line
              {displayableLines.length - visibleLines.length === 1 ? '' : 's'}{' '}
              hidden ...
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export function DiffViewer({
  originalContent,
  newContent,
  fileName,
  maxHeight = DEFAULT_MAX_HEIGHT,
  terminalWidth = DEFAULT_TERMINAL_WIDTH,
}: DiffProps) {
  const diffLines = useMemo(
    () => generateDiffLines(originalContent, newContent, fileName),
    [originalContent, newContent, fileName],
  );

  if (diffLines.length === 0) {
    return (
      <Box paddingX={1} flexDirection="column">
        {fileName && (
          <Box paddingX={1}>
            <Text bold color="cyan">
              {fileName}
            </Text>
          </Box>
        )}
        <Box paddingX={1}>
          <Text dimColor>No changes detected</Text>
        </Box>
      </Box>
    );
  }

  if (isNewFile(diffLines)) {
    return RenderNewFileContent(diffLines, fileName, terminalWidth);
  }

  return RenderDiffContent(diffLines, fileName, maxHeight, terminalWidth);
}
