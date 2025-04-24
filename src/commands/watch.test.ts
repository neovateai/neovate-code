import { expect, test } from 'vitest';
import { getAIComment } from './watch';

test('getAIComment with !', () => {
  const content = '// hello AI!';
  const result = getAIComment(content);
  expect(result).toEqual({
    lineNums: [1],
    comments: ['// hello AI!'],
    hasAction: '!',
  });
});

test('getAIComment with ?', () => {
  const content = '// hello AI?';
  const result = getAIComment(content);
  expect(result).toEqual({
    lineNums: [1],
    comments: ['// hello AI?'],
    hasAction: '?',
  });
});

test('getAIComment without AI comment', () => {
  const content = '// hello';
  const result = getAIComment(content);
  expect(result).toEqual(null);
});
