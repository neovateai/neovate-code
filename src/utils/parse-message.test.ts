import { describe, expect, it } from 'vitest';
import { parseMessage } from './parse-message';

// TODO: refact these test cases
describe('parseMessage', () => {
  describe('纯文本解析', () => {
    it('应该解析纯文本内容', () => {
      const input = 'Hello, this is a simple text message.';
      const result = parseMessage(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'text',
        content: 'Hello, this is a simple text message.',
        partial: true,
      });
    });

    it('应该处理空字符串', () => {
      const input = '';
      const result = parseMessage(input);

      expect(result).toHaveLength(0);
    });

    it('应该处理只有空格的字符串', () => {
      const input = '   \n  \t  ';
      const result = parseMessage(input);

      expect(result).toHaveLength(0);
    });
  });

  describe('完整工具使用解析', () => {
    it('应该解析包含文本和完整工具使用的消息', () => {
      const input = `To provide you with the current weather in Tokyo, I will retrieve the latest information. Please hold on for a moment.

<use_tool>
<tool_name>weather</tool_name>
<arguments>
{"city": "Tokyo"}
</arguments>
</use_tool>`;

      const result = parseMessage(input);

      expect(result).toHaveLength(2);

      // 检查文本部分
      expect(result[0]).toEqual({
        type: 'text',
        content:
          'To provide you with the current weather in Tokyo, I will retrieve the latest information. Please hold on for a moment.',
        partial: false,
      });

      // 检查工具使用部分
      expect(result[1]).toEqual({
        type: 'tool_use',
        name: 'weather',
        params: { city: 'Tokyo' },
        partial: false,
      });
    });

    it('应该解析多个工具使用', () => {
      const input = `I'll help you with both tasks.

<use_tool>
<tool_name>weather</tool_name>
<arguments>
{"city": "Tokyo"}
</arguments>
</use_tool>

Let me also check the time.

<use_tool>
<tool_name>current_time</tool_name>
<arguments>
{"timezone": "Asia/Tokyo"}
</arguments>
</use_tool>`;

      const result = parseMessage(input);

      expect(result).toHaveLength(4);
      expect(result[0].type).toBe('text');
      expect(result[1].type).toBe('tool_use');
      expect(result[2].type).toBe('text');
      expect(result[3].type).toBe('tool_use');
    });

    it('应该解析没有参数的工具使用', () => {
      const input = `<use_tool>
<tool_name>get_current_time</tool_name>
<arguments>
{}
</arguments>
</use_tool>`;

      const result = parseMessage(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'get_current_time',
        params: {},
        partial: false,
      });
    });
  });

  describe('部分工具使用解析（流式场景）', () => {
    it('应该解析不完整的工具使用（只有开始标签）', () => {
      const input = 'Let me help you with that.\n\n<use_tool>';
      const result = parseMessage(input);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'text',
        content: 'Let me help you with that.',
        partial: false,
      });
      expect(result[1]).toEqual({
        type: 'tool_use',
        name: '',
        params: {},
        partial: true,
      });
    });

    it('应该解析不完整的工具名称', () => {
      const input = `<use_tool>
<tool_name>weath`;
      const result = parseMessage(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'weath',
        params: {},
        partial: true,
      });
    });

    it('应该解析完整的工具名称但不完整的参数', () => {
      const input = `<use_tool>
<tool_name>weather</tool_name>
<arguments>
{"city": "Tok`;
      const result = parseMessage(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'weather',
        params: {
          city: 'Tok',
        },
        partial: true,
      });
    });

    it('应该处理无效的JSON参数', () => {
      const input = `<use_tool>
<tool_name>weather</tool_name>
<arguments>
{invalid json}
</arguments>
</use_tool>`;
      const result = parseMessage(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'weather',
        params: {
          _error: 'Invalid or incomplete JSON',
          _raw: '{invalid json}',
        },
        partial: false,
      });
    });
  });

  describe('复杂场景', () => {
    it('应该处理文本中包含类似标签的内容', () => {
      const input =
        'The HTML tag <tool_name> is different from our tool syntax.';
      const result = parseMessage(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'text',
        content: 'The HTML tag <tool_name> is different from our tool syntax.',
        partial: true,
      });
    });

    it('应该处理嵌套的JSON对象', () => {
      const input = `<use_tool>
<tool_name>complex_api</tool_name>
<arguments>
{
  "user": {
    "name": "John",
    "age": 30
  },
  "settings": {
    "theme": "dark",
    "notifications": true
  }
}
</arguments>
</use_tool>`;

      const result = parseMessage(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'complex_api',
        params: {
          user: {
            name: 'John',
            age: 30,
          },
          settings: {
            theme: 'dark',
            notifications: true,
          },
        },
        partial: false,
      });
    });

    it('应该处理空的arguments标签', () => {
      const input = `<use_tool>
<tool_name>simple_tool</tool_name>
<arguments>
</arguments>
</use_tool>`;

      const result = parseMessage(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'simple_tool',
        params: {},
        partial: false,
      });
    });

    it('应该处理工具使用后的文本', () => {
      const input = `<use_tool>
<tool_name>weather</tool_name>
<arguments>
{"city": "Tokyo"}
</arguments>
</use_tool>

Based on the weather data, it looks like a great day!`;

      const result = parseMessage(input);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('tool_use');
      expect(result[1]).toEqual({
        type: 'text',
        content: 'Based on the weather data, it looks like a great day!',
        partial: true,
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理只有工具标签没有内容的情况', () => {
      const input = '<use_tool></use_tool>';
      const result = parseMessage(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: '',
        params: {},
        partial: false,
      });
    });

    it('应该处理标签前后有大量空白的情况', () => {
      const input = `

<use_tool>
<tool_name>   weather   </tool_name>
<arguments>
   {"city": "Tokyo"}
</arguments>
</use_tool>

   `;

      const result = parseMessage(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'weather',
        params: { city: 'Tokyo' },
        partial: false,
      });
    });

    it('should parse tool use with jsonrepair', () => {
      const input = `<use_tool>
<tool_name>edit</tool_name>
<arguments>
{"file_path": "src/ui/constants.ts", "old_string": "1"}}
</arguments>
</use_tool>`;
      const result = parseMessage(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'edit',
        params: { file_path: 'src/ui/constants.ts', old_string: '1' },
        partial: false,
      });
    });

    it('处理 json 末尾包含特殊换行符', () => {
      const input = `\n\n<use_tool>\n<tool_name>write</tool_name>\n<arguments>\n{"file_path": "src/ui/components/ContentBox.tsx", "content": "import React from 'react';\\nconst hello = 'world';\n"}\\n</arguments>\n</use_tool>`;

      const result = parseMessage(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'write',
        params: {
          file_path: 'src/ui/components/ContentBox.tsx',
          content: "import React from 'react';\nconst hello = 'world';\n",
        },
        partial: false,
      });
    });

    it('处理 use_tool 完整但是 arguments 未闭合的情况', () => {
      const input = `<use_tool>
      <tool_name>edit</tool_name>
      <arguments>
      {"file_path": "src/ui/constants.ts", "old_string": "1"}
      </use_tool>`;
      const result = parseMessage(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'edit',
        params: { file_path: 'src/ui/constants.ts', old_string: '1' },
        partial: true,
      });
    });

    it('当 jsonrepair 无法修复时，应该回退', () => {
      const input = `<use_tool>
<tool_name>test_tool</tool_name>
<arguments>
{{"demo":"This is not JSON at all""
</arguments>
</use_tool>`;
      const result = parseMessage(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'test_tool',
        params: {
          _error: 'Invalid or incomplete JSON',
          _raw: '{{"demo":"This is not JSON at all""',
        },
        partial: false,
      });
    });
  });
});
