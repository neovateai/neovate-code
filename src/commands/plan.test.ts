import { expect, test } from 'vitest';
import { askUserForMoreInformation, isRequirementsComplete, removeThinkTags } from './plan';

// test('isRequirementsComplete', async () => {
//   const result = await isRequirementsComplete(['create a.txt include text foo']);
//   expect(result).toBe(true);
// });

// test('isRequirementsComplete', async () => {
//   const result = await isRequirementsComplete(['write a test case']);
//   expect(result).toBe(false);
// });

// test('askUserForMoreInformation', async () => {
//   const result = await askUserForMoreInformation(['write a test case']);
//   console.log(result);
//   throw new Error('Not implemented');
// });

test('removeThinkTags', async () => {
  const result = removeThinkTags('<think>\n aa \n</think>\ncc');
  expect(result).toBe('cc');
});
