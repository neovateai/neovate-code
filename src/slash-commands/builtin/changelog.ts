import type { PromptCommand } from '../types';

export const changelogCommand: PromptCommand = {
  type: 'prompt',
  name: 'changelog',
  description: '列出最近两版更新',
  progressMessage: '正在读取并润色更新日志…',
  async getPromptForCommand(_args?: string) {
    const user = `你是发布说明专家，请：

1) 使用 read("CHANGELOG.md") 读取项目根目录的更新记录。
2) 解析最近两段以 "## x.y.z" 开头的版本区块，并识别紧随其后的日期行（形如 \`YYYY-MM-DD\`）。
3) 基于原始条目进行中文润色，输出更易读的更新日志：
   - 每个版本使用标题：在最前加入合适的 emoji（如 🚀/🎉），并为“版本号”和“日期”添加 ANSI 颜色：
     - 版本号使用 \x1b[1m\x1b[97m（亮白加粗），示例：\x1b[1m\x1b[97m0.15.0\x1b[0m
     - 日期使用 \x1b[36m（青色），示例：\x1b[36m2025-11-02\x1b[0m
     - 标题示例："🚀 版本 \x1b[1m\x1b[97mx.y.z\x1b[0m（\x1b[36mYYYY-MM-DD\x1b[0m）"
   - 下方用简洁要点列出变更，合并或去重冗余信息，统一动词风格（如：新增、修复、优化、重构、样式、依赖、文档）。
   - 为要点添加直观的 emoji 前缀:
     - 新增：🚀
     - 修复：🛠️
     - 优化：✨
     - 重构：♻️
     - 样式：🎨
     - 依赖：📦
     - 文档：📝
   - 保留关键信息（功能点、范围、关联 PR 编号或作者），删除噪声与实现细节。
   - 仅输出最近两个版本，不包含其它内容。

要求：
- 语言：根据用户输入的语言，回答相应的语言。
- 语气：专业、简洁，便于快速浏览。
- 结构：按版本分块，标题 + 要点列表。
`;
    return [
      {
        role: 'user',
        content: user,
      },
    ];
  },
};

export default changelogCommand;
