import type { Delta } from 'quill';
import type { ContextBlotData } from '@/components/QuillEditor/ContextBlot';
import { CONTEXT_BLOT_NAME } from '@/constants';

export function getPrompt(delta: Delta) {
  return delta.ops
    .map((op) => {
      if (typeof op.insert === 'string') {
        return op.insert;
      }

      if (op.insert?.[CONTEXT_BLOT_NAME]) {
        const blotData = op.insert?.[CONTEXT_BLOT_NAME] as ContextBlotData;
        return `${blotData.prefix}${blotData.value}`;
      }

      return op.insert;
    })
    .join('');
}
