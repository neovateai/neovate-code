import { DEFAULT_OUTPUT_STYLE_NAME } from '../../constants';
import type { OutputStyle } from '../types';

export const defaultOutputStyle: OutputStyle = {
  name: DEFAULT_OUTPUT_STYLE_NAME,
  description: 'Default output style',
  isCodingRelated: true,
  prompt: '',
};
