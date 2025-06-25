import type { ToolMessage } from '@/types/message';

const mockData = {
  type: 'tool',
  toolCallId: '96e26a4b-616d-4c66-b876-24b26840e393',
  toolName: 'write',
  args: {
    file_path: '/Users/taohongyu/Desktop/takumi/README.md',
    content:
      '# Takumi - AI-Powered Development Assistant\n\n[![npm version](https://badgen.net/npm/v/takumi)](https://www.npmjs.com/package/takumi)\n[![npm downloads](https://badgen.net/npm/dm/takumi)](https://www.npmjs.com/package/takumi)\n[![CI Status](https://github.com/umijs/takumi/actions/workflows/ci.yml/badge.svg)](https://github.com/umijs/takumi/actions/workflows/ci.yml)\n[![License](https://badgen.net/npm/license/takumi)](https://www.npmjs.com/package/takumi)\n\n## 🚀 Overview\n\nTakumi (/tɑːˈkuːmi/) is an intelligent CLI assistant that supercharges your development workflow through AI-powered automation.\n\n```bash\nta "Fix the TypeScript error in src/utils/parser.ts" -m gpt4\n```\n\n## ✨ Core Features\n\n### 🤖 AI-Powered Development\n- **Multi-LLM Support**: Switch between OpenAI, Anthropic, Google Gemini, and more\n- **Context-Aware**: Understands your codebase structure and history\n- **Model Management**: Create aliases for frequently used models\n\n### 🛠️ Code Operations\n```bash\nta "Create a React component in src/components/Button.tsx" -m claude\n```\n- Read/write/edit files with natural language\n- Intelligent code search and navigation\n- Safe sandboxed execution environment\n\n### ⚡ Workflow Automation\n```bash\nta "Implement user auth" -m gpt4 --plan\n```\n- Break down complex tasks into steps\n- Generate conventional commit messages\n- React to code changes via file watching\n\n### 🔌 Extensibility\n- Custom plugins system (`src/plugins/`)\n- MCP integration (GitHub/Jira/CI/CD)\n- Project-specific guidelines (`TAKUMI.md`)\n\n## 🛠️ Installation\n\n```bash\n# Using npm\nnpm install -g takumi\n\n# Using pnpm\npnpm add -g takumi\n\n# Using yarn\nyarn global add takumi\n```\n\n## � Quick Start\n\n1. **Configure API Keys**\n```bash\nexport OPENAI_API_KEY="your-key"\nexport ANTHROPIC_API_KEY="your-key"\n```\n\n2. **Initialize Project**\n```bash\nta init -m gpt4\n```\n\n3. **Basic Usage**\n```bash\n# Single command execution\nta "Fix the TypeScript error" -m gpt4\n\n# Task planning & execution\nta "Add user authentication" -m gpt4 --plan\n\n# Commit workflow\ngit add .\nta commit -m claude --stage --commit\n```\n\n## 📚 Documentation\n\n- [Commands Reference](./docs/commands.md)\n- [LLM Configuration](./docs/llms.md)\n- [Plugin Development](./docs/plugin.md)\n- [Contributing Guide](./CONTRIBUTING.md)\n\n## 📜 License\n\n[MIT](./LICENSE)',
  },
  state: 'result',
  step: 1,
  result:
    'File successfully written to /Users/taohongyu/Desktop/takumi/README.md',
};

export default function WriteRender({ message }: { message: ToolMessage }) {
  console.log('message', message);
  return <div>WriteRender</div>;
}
