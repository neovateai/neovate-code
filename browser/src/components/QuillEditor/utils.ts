import { differenceBy } from 'lodash-es';
import { Delta } from 'quill';
import { CONTEXT_BLOT_NAME } from '@/constants';
import type { ContextBlotData } from './ContextBlot';

export function getBlotName(blotData: ContextBlotData) {
  const { prefix } = blotData;
  if (prefix === '@') {
    return `[File ${prefix} ${blotData.text}]`;
  }

  if (prefix === '/') {
    return `[Slash Command ${prefix} ${blotData.text}]`;
  }

  return `[Context ${prefix} ${blotData.text}]`;
}

/** DO NOT USE QUILL's `getText`, it won't work with takumi-context.*/
export function getTextWithTakumiContext(contents: Delta) {
  return contents.ops
    .map((op) => {
      if (typeof op.insert === 'string') {
        return op.insert;
      }

      if (op.insert?.[CONTEXT_BLOT_NAME]) {
        const blotData = op.insert?.[CONTEXT_BLOT_NAME] as ContextBlotData;
        return getBlotName(blotData);
      }
      return op.insert;
    })
    .join('');
}

export function getTakumiContexts(contents: Delta) {
  return contents.ops
    .filter(
      (op) =>
        op.insert &&
        typeof op.insert === 'object' &&
        op.insert[CONTEXT_BLOT_NAME],
    )
    .map(
      (op) =>
        (op.insert as Record<'takumi-context', ContextBlotData>)?.[
          CONTEXT_BLOT_NAME
        ],
    );
}

export function getRemovedTakumiContexts(
  oldContents: Delta,
  newContents: Delta,
) {
  const oldContexts = getTakumiContexts(oldContents);
  const newContexts = getTakumiContexts(newContents);
  return differenceBy(oldContexts, newContexts, 'value');
}

export function getInsertText(delta: Delta) {
  if (!delta.ops.length) {
    return undefined;
  }
  const last = delta.ops[delta.ops.length - 1];
  return last.insert;
}

export function getDeletedLength(delta: Delta) {
  if (!delta.ops.length) {
    return undefined;
  }
  const last = delta.ops[delta.ops.length - 1];
  return last.delete;
}

export function isInsertingAt(delta: Delta) {
  return getInsertText(delta) === '@';
}

export function isInsertingSlash(delta: Delta) {
  return getInsertText(delta) === '/';
}

export function isEditorEmpty(contents: Delta): boolean {
  if (contents.ops.length === 1) {
    const op = contents.ops[0];
    return op.insert === '\n';
  }
  return contents.ops.length === 0;
}

const BLOT_NAME_REGEX = /\[(File|Slash Command|Context)\s+([^\]]+)\]/g;
// Separate plain text and delta in the text, e.g. [File @ file.ts] demo [File @ file2.ts]
export function convertTextToDelta(text: string): Delta {
  const delta = new Delta();
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex to start from beginning
  BLOT_NAME_REGEX.lastIndex = 0;

  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = BLOT_NAME_REGEX.exec(text)) !== null) {
    const [fullMatch, type, content] = match;
    const matchStart = match.index;

    // Add text before the match as regular text
    if (matchStart > lastIndex) {
      const textBefore = text.slice(lastIndex, matchStart);
      delta.insert(textBefore);
    }

    // Parse the blot content and create ContextBlot
    const blotData = parseBlotContent(type, content);
    if (blotData) {
      delta.insert({ [CONTEXT_BLOT_NAME]: blotData });
    } else {
      // If parsing fails, insert as regular text
      delta.insert(fullMatch);
    }

    lastIndex = matchStart + fullMatch.length;
  }

  // Add remaining text after the last match
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    delta.insert(remainingText);
  }

  return delta;
}

function parseBlotContent(
  type: string,
  content: string,
): ContextBlotData | null {
  // Parse "@ filename", "/ commandname", or other formats
  const parts = content.trim().split(' ');
  if (parts.length < 2) return null;

  const prefix = parts[0];
  const text = parts.slice(1).join(' ');

  // Validate prefix based on type
  if (type === 'File' && prefix !== '@') return null;
  if (type === 'Slash Command' && prefix !== '/') return null;
  if (type === 'Context' && !prefix) return null;

  return {
    prefix,
    text,
    value: `${prefix}${text}`,
    prompt: `${prefix}${text}`, // Use the same value for prompt by default
  };
}
