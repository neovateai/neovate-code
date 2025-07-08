import type { EditParams, WriteParams } from './get-diff-params';

export function isEditParams(params: any): params is EditParams {
  return (
    params &&
    typeof params === 'object' &&
    'old_string' in params &&
    'new_string' in params &&
    'file_path' in params &&
    typeof params.old_string === 'string' &&
    typeof params.new_string === 'string' &&
    typeof params.file_path === 'string'
  );
}

export function isWriteParams(params: any): params is WriteParams {
  return (
    params &&
    typeof params === 'object' &&
    'content' in params &&
    'file_path' in params &&
    typeof params.content === 'string' &&
    typeof params.file_path === 'string'
  );
}

export function isEditOrWriteParams(
  params: any,
): params is EditParams | WriteParams {
  return isEditParams(params) || isWriteParams(params);
}

export interface SelectOption {
  label: string;
  value: string;
}

export function isSelectOption(item: any): item is SelectOption {
  return (
    item &&
    typeof item === 'object' &&
    'label' in item &&
    'value' in item &&
    typeof item.label === 'string' &&
    typeof item.value === 'string'
  );
}
