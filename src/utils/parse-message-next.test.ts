import { expect, test } from 'vitest';
import { parseMessage } from './parse-message';
import type { ToolUse } from '../tool';

test('compatible <argument>', () => {
  const input = `<use_tool>
<tool_name>weather</tool_name>
<argument>
{"city": "Tokyo"}
</argument>
</use_tool>`;
  const result = parseMessage(input);
  const params = (result[0] as ToolUse).params;
  expect(params).toEqual({ city: 'Tokyo' });
});
