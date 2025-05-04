// 测试 流式渲染
import { StreamRenderer } from './markdown';

const chunkList = [
  // 基础块
  '# 标题1\n',
  '## 标题2\n',
  '正文段落。\n',

  // 简单列表
  '- 无序项1\n',
  '- 无序项2',
  '\n',
  '1. 有序项1\n',
  '2. 有序',
  '项2\n',

  // 格式化
  '**粗体** 和 *斜体*\n',
  '`行内代码` 示例\n',

  // 完整代码块
  '```python\n',
  'def hello():\n',
  '  print("Hello")\n',
  '```\n',

  // 引用
  '> 这是一个引用块\n',
  '> 第二行引用\n',

  // 链接和图片
  '[链接](https://example.com)\n',
  '![图片描述](image.png)\n',

  // 分隔线
  '---\n',

  // 简单表格
  '| 表头1 | 表头2 |\n',
  '| ----- | ----- |\n',
  '| 单元格1 | 单元格2 |\n',

  // --- 复杂和边缘情况 ---

  // 1. 嵌套列表
  '- 外层列表项1\n',
  '  - 内层列表项A\n',
  '  - 内层列表项B\n',
  '- 外层列表项2\n',
  '  1. 内层有序项1\n',
  '  2. 内层有序项2\n',

  // 2. 列表项内代码块
  '- 列表项包含代码:\n',
  '  ```javascript\n',
  '  function test() {\n',
  '    return true;\n',
  '  }\n',
  '  ```\n',

  // 3. Markdown 结构中间断开
  '这是**加粗文本的开',
  '始**部分。\n',
  '这是*斜体文本的',
  '一部分*。\n',
  '这是`行内代',
  '码`示例。\n',
  '[链接文本](ht',
  'tps://link.com)\n',
  '```go\nfunc main() {\n', // 代码块内断开
  '  fmt.Println("Go")\n}',
  '\n```\n',

  // 4. 引用内嵌套和断开
  '> 外层引用\n',
  '> > 内层引用\n', // 嵌套引用
  '> 继续外层引用',
  ' 分断\n',

  // 5. 表格行内断开
  '| Col A | Col B |\n',
  '|---|---|',
  '\n',
  '| Data A1 | Data B',
  '1 |\n',
  '| Data A2 | Data ',
  'B2 |\n',

  // 6. 混合内容的 chunk
  '这是一个段落，包含**加粗**和 `代码`。\n> 紧随一个引用块。',
  '\n- 还有一个列表项\n',

  // 7. 不完整结束 (模拟流中断)
  '# 另一个标题\n',
  '这是一个未完成的列表:\n- Item 1\n',
  '- Item 2 (未换行)',

  // 8. 特殊字符和转义
  '带有 \\*特殊\\_字符\\`的文本\n',

  // 9. 复杂嵌套和混合
  '- 列表项\n',
  '  > 嵌套引用\n',
  '  > ```js\n',
  '  > console.log("嵌套");\n',
  '  > ```\n',
  '- 第二个列表项， *带斜体*\n',
];

const renderer = new StreamRenderer();

for (const chunk of chunkList) {
  // 打字机
  process.stdout.write(renderer.append(chunk));

  // 等待100ms
  await new Promise((resolve) => setTimeout(resolve, 50));
}
