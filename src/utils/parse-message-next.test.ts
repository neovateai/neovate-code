import { expect, test } from 'vitest';
import type { ToolUse } from '../tool';
import { parseMessage } from './parse-message';

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
