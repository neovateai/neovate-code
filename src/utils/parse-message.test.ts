import { describe, expect, it } from 'vitest';
import { parseMessage } from './parse-message';

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
          _error: 'Incomplete JSON',
          _raw: '{"city": "Tok',
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
  });

  describe('The "to" argument must be of type string', () => {
    it('should parse tool use', () => {
      const input =
        '现在我发现了一个关键问题！在 `TOOL_DESCRIPTION_EXTRACTORS` 中，bash 的描述提取器直接返回 `args.command`，这意味着对于长命令，每次都会返回完整的命令字符串作为描述。这就是卡顿的主要原因！\n\n让我优化这个问题：\n\n<use_tool>\n<tool_name>edit</tool_name>\n<arguments>\n{"file_path": "src/ui/constants.ts", "old_string": "  [TOOL_NAMES.BASH]: (args: any, cwd: string) => args.command,", "new_string": "  [TOOL_NAMES.BASH]: (args: any, cwd: string) => {\\n    const command = String(args.command || \'\');\\n    return command.length > 100 ? `${command.slice(0, 100)}...` : command;\\n  },"}}\n</arguments>\n</use_tool>\n\n现在我需要恢复 ApprovalModal 中对 bash 描述的显示，因为现在描述已经被优化了：\n\n<use_tool>\n<tool_name>edit</tool_name>\n<arguments>\n{"file_path": "src/ui/components/ApprovalModal.tsx", "old_string": "  const description = useMemo(() => {\\n    if (toolName === \'bash\') {\\n      return \'\';\\n    }\\n    return getToolDescription(toolName, params);\\n  }, [toolName, params, getToolDescription]);", "new_string": "  const description = useMemo(() => {\\n    return getToolDescription(toolName, params);\\n  }, [toolName, params, getToolDescription]);"}}\n</arguments>\n</use_tool>\n\n<use_tool>\n<tool_name>edit</tool_name>\n<arguments>\n{"file_path": "src/ui/components/ApprovalModal.tsx", "old_string": "        <Box marginY={1}>\\n          <Text bold color={UI_COLORS.TOOL}>\\n            {toolName}\\n          </Text>\\n        </Box>", "new_string": "        <Box marginY={1}>\\n          <Text>\\n            <Text bold color={UI_COLORS.TOOL}>\\n              {toolName}\\n            </Text>\\n            {description && (\\n              <Text color={UI_COLORS.SUCCESS}> ({description})</Text>\\n            )}\\n          </Text>\\n        </Box>"}}\n</arguments>\n</use_tool>\n\n## 根本问题解决\n\n我发现了真正的性能瓶颈：`TOOL_DESCRIPTION_EXTRACTORS` 中的 bash 提取器直接返回完整命令，导致：\n\n1. **重复渲染长文本**: 描述和参数都显示完整命令\n2. **UI 渲染负担**: Ink 需要渲染两次长文本\n3. **内存占用**: 保存多份长字符串引用\n\n### 解决方案\n\n1. **优化描述提取器**: 在 `constants.ts` 中截断 bash 命令描述为 100 字符\n2. **保持完整显示**: 在参数区域仍显示完整命令（已截断处理）\n3. **缓存优化**: 使用 `useMemo` 避免重复计算\n\n这样既解决了性能问题，又保持了用户体验——描述区显示命令预览，参数区显示详细信息。';
      const result = parseMessage(input);
      expect(result[1]).toEqual({
        type: 'tool_use',
        name: 'edit',
        params: {
          file_path: 'src/ui/constants.ts',
          old_string:
            '  [TOOL_NAMES.BASH]: (args: any, cwd: string) => args.command,',
          new_string:
            '  [TOOL_NAMES.BASH]: (args: any, cwd: string) => {\n' +
            "    const command = String(args.command || '');\n" +
            '    return command.length > 100 ? `${command.slice(0, 100)}...` : command;\n' +
            '  },',
        },
        partial: false,
      });
    });
  });
});
