// 测试 renderMarkdown 是否能正常工作
import { renderMarkdown } from './markdown';

const markdown = `# Markdown 语法示例

## 标题

### 三级标题
#### 四级标题

## 文本格式

**粗体文本** 和 *斜体文本*

~~删除线文本~~

## 列表

无序列表:
- 项目 1
- 项目 2
  - 子项目 2.1
  - 子项目 2.2

有序列表:
1. 第一项
2. 第二项
   1. 子项 2.1
   2. 子项 2.2

## 引用

> 这是一段引用文本
> 可以有多行

## 代码

行内代码: \`console.log('Hello')\`

代码块:
\`\`\`javascript
function hello() {
  return "Hello World!";
}
\`\`\`

## 表格

| 表头1 | 表头2 | 表头3 |
|-------|-------|-------|
| 内容1 | 内容2 | 内容3 |
| 行2列1| 行2列2| 行2列3|

## 链接和图片

[链接文本](https://example.com)

![图片描述](https://example.com/image.jpg)
`;
process.stdout.write(renderMarkdown(markdown));
