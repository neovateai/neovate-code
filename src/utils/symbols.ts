import isUnicodeSupported from 'is-unicode-supported';

const unicode = isUnicodeSupported();

export const symbols = {
  checkboxOn: unicode ? '☑' : '[x]',
  checkboxOff: unicode ? '☐' : '[ ]',
  tick: unicode ? '✓' : '√',
  cross: unicode ? '✗' : 'x',
  pointer: unicode ? '❯' : '>',
  arrowRight: unicode ? '→' : '->',
  pointerSmall: unicode ? '›' : '>',
  line: unicode ? '⎿' : '|',
  bullet: unicode ? '•' : '*',
  info: unicode ? 'ℹ' : 'i',
  warning: unicode ? '⚠' : '!',
  arrowDown: unicode ? '↳' : '└',
};
