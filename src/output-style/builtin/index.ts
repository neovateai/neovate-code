import type { OutputStyle } from '../types';
import { defaultOutputStyle } from './default';
import { explanatoryOutputStyle } from './explanatory';
import { miaoOutputStyle } from './miao';

export * from './default';
export * from './explanatory';
export * from './miao';

export function getBuiltinOutputStyles(): OutputStyle[] {
  return [defaultOutputStyle, explanatoryOutputStyle, miaoOutputStyle];
}
