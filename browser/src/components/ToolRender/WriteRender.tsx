import type { ToolMessage } from '@/types/message';

const mockData = {
  type: 'tool',
  toolCallId: '23f7aaba-8335-462b-b522-381f4c5abb01',
  toolName: 'write',
  args: {
    file_path: 'README.md',
    content:
      '# Takumi - AI-Powered Coding Assistant\n\n[![npm version](https://badgen.net/npm/v/takumi)](https://www.npmjs.com/package/takumi)\n[![npm downloads](https://badgen.net/npm/dm/takumi)](https://www.npmjs.com/package/takumi)\n[![CI Status](https://github.com/umijs/takumi/actions/workflows/ci.yml/badge.svg)](https://github.com/umijs/takumi/actions/workflows/ci.yml)\n[![License](https://badgen.net/npm/license/takumi)](https://www.npmjs.com/package/takumi)\n\nPronounced `/tɑːˈkuːmi/` (匠), Takumi is an intelligent coding assistant CLI that enhances developer productivity through AI-powered automation.\n\n## Features\n\n### Core Capabilities\n- **AI-Powered Coding**: Leverage various LLM providers (OpenAI, Groq, DeepSeek, etc.)\n- **File Operations**: Read/write/edit files through natural language commands\n- **Codebase Navigation**: Intelligent search and exploration\n- **Safe Command Execution**: Run shell commands with built-in security checks\n\n### Productivity Boosters\n- **Plan Mode**: Break complex tasks into manageable steps\n- **Commit Automation**: Generate conventional commit messages\n- **Project Guidance**: Initialize with `TAKUMI.md` for consistent standards\n\n## Installation\n\n```bash\nnpm install -g takumi\n# or\npnpm add -g takumi\n# or\nbun add -g takumi\n# or\nyarn global add takumi\n```\n\n## Quick Start\n\n1. Set your API key:\n```bash\nexport OPENAI_API_KEY="your-api-key"\n```\n\n2. Initialize your project:\n```bash\ntakumi init -m gpt-4\n```\n\n3. Start using Takumi:\n```bash\ntakumi "Refactor this component" src/components/MyComponent.tsx -m gpt-4\n```\n\n## Usage Examples\n\n### Basic Code Assistance\n```bash\ntakumi "Add TypeScript types to this file" src/utils/chat.ts -m gpt-4\n```\n\n### Plan Mode (Complex Tasks)\n```bash\ntakumi "Implement user authentication" --plan -m gpt-4\n```\n\n### Commit Automation\n```bash\ntakumi commit -m gpt-4 --stage --commit\n```\n\n## Configuration\n\nConfigure through:\n- Environment variables\n- `.env` file\n- `TAKUMI.md` project guidelines\n\n## Troubleshooting\n\n### Common Issues\n- **API Key Not Found**: Verify environment variables\n- **Permission Errors**: Try global install with `sudo`\n- **Model Not Available**: Check provider documentation\n\n## Contributing\n\nSee [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.\n\n## License\n\n[MIT](./LICENSE) © [UmiJS](https://umijs.org/)',
  },
  state: 'result',
  step: 1,
  result: 'File successfully written to README.md',
};

export default function WriteRender({ message }: { message: ToolMessage }) {
  return <div>WriteRender</div>;
}
