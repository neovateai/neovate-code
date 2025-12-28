import type { OutputStyle } from '../types';
import { defaultOutputStyle } from './default';
import { explanatoryOutputStyle } from './explanatory';
import { miaoOutputStyle } from './miao';
import { minimalOutputStyle } from './minimal';

export * from './default';
export * from './explanatory';
export * from './miao';
export * from './minimal';

export function getBuiltinOutputStyles(): OutputStyle[] {
  return [
    defaultOutputStyle,
    explanatoryOutputStyle,
    miaoOutputStyle,
    minimalOutputStyle,
  ];
}
