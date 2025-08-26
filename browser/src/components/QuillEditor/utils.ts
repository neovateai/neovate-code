import { differenceBy } from 'lodash-es';
import type { Delta } from 'quill';
import type { ContextBlotData } from './ContextBlot';

/** DO NOT USE QUILL's `getText`, it won't work with takumi-context.*/
export function getTextWithTakumiContext(contents: Delta) {
  return contents.ops
    .filter(
      (op) =>
        typeof op.insert === 'string' ||
        (op.insert &&
          (op.insert['takumi-context'] as ContextBlotData)?.value &&
          typeof (op.insert['takumi-context'] as ContextBlotData).value ===
            'string'),
    )
    .map((op) => {
      return typeof op.insert === 'string'
        ? op.insert
        : (op.insert!['takumi-context'] as ContextBlotData).value;
    })
    .join('');
}

export function getTakumiContexts(contents: Delta) {
  return contents.ops
    .filter(
      (op) =>
        op.insert &&
        typeof op.insert === 'object' &&
        op.insert['takumi-context'],
    )
    .map(
      (op) =>
        (op.insert as Record<'takumi-context', ContextBlotData>)![
          'takumi-context'
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

export function isInsertingAt(delta: Delta) {
  const last = delta.ops[delta.ops.length - 1];
  return last.insert === '@';
}
