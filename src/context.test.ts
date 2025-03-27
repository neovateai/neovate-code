import { expect, test } from 'vitest';
import { getContext } from './context';

test('getDirectoryStructure should return files from lsTool', async () => {
  const result = await getContext({ codebase: false });
  // console.log('>> result', result);
  expect(result.directoryStructure).toBeDefined();
});
