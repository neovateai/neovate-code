import type { Delta } from 'quill';

/** DO NOT USE QUILL's `getText`, it won't work with takumi-context.*/
export function getTextWithTakumiContext(contents: Delta) {
  return contents.ops
    .filter(
      (op) =>
        typeof op.insert === 'string' ||
        (op.insert &&
          (op.insert['takumi-context'] as any)?.value &&
          typeof (op.insert['takumi-context'] as any).value === 'string'),
    )
    .map((op) => {
      return typeof op.insert === 'string'
        ? op.insert
        : (op.insert!['takumi-context'] as any).value;
    })
    .join('');
}

export function isInsertingAt(delta: Delta) {
  const last = delta.ops[delta.ops.length - 1];
  return last.insert === '@';
}
