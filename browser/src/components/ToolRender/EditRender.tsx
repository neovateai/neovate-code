import type { ToolMessage } from '@/types/message';

const mockData = {
  type: 'tool',
  toolCallId: '29e5f61b-4314-4903-9180-1531eac6fbd5',
  toolName: 'edit',
  args: {
    file_path: '/Users/taohongyu/Desktop/takumi/README.md',
    old_string:
      '## Core Features\n\n### AI Integration\n- **Multi-LLM Support**: OpenAI, Google, Groq, DeepSeek and more\n- **Model Management**: Aliases and configuration for different LLMs\n- **Context Awareness**: Maintains project context for better suggestions\n\n### Code Operations\n- **File Management**: Read/write/edit files with AI commands\n- **Code Navigation**: Intelligent search and exploration\n- **Safe Execution**: Sandboxed command execution\n\n### Workflow Automation\n- **Task Planning**: Break down complex tasks into steps\n- **Auto Commit**: Generate conventional commit messages\n- **File Watching**: React to code changes with AI instructions\n\n### Extensibility\n- **Plugin System**: Extend functionality with custom plugins\n- **MCP Integration**: Connect with external tools and services\n- **Customizable**: Configure through TAKUMI.md guidelines',
    new_string:
      '## Core Features\n\n### 🤖 AI Integration\n- **Multi-LLM Support**: Seamlessly switch between OpenAI, Google Gemini, Groq, DeepSeek and other providers\n- **Model Management**: Create aliases for frequently used models (e.g. `gpt4=openai/gpt-4-1106-preview`)\n- **Context Awareness**: Maintains full project context including:\n  - File structures\n  - Recent changes\n  - Current working directory\n\n### 💻 Code Operations\n- **File Management**:\n  ```bash\n  ta "create a React component in src/components/Button.tsx" -m gpt4\n  ```\n- **Intelligent Search**: Find code by semantic meaning\n- **Safe Execution**: All commands run in isolated sandbox\n\n### ⚡ Workflow Automation\n- **Task Planning**:\n  ```bash\n  ta "implement user authentication" -m gpt4 --plan\n  ```\n- **Auto Commit**: Conventional commits with context-aware messages\n- **File Watching**: React to code changes via special comments:\n  ```ts\n  // @takumi: optimize this function\n  ```\n\n### 🔌 Extensibility\n- **Plugins**: Add custom tools via `src/plugins/` directory\n- **MCP Integration**: Connect with:\n  - GitHub/GitLab\n  - Jira/Linear\n  - CI/CD pipelines\n- **Custom Guidelines**: Define project-specific rules in `TAKUMI.md`',
  },
  state: 'result',
  step: 1,
  result: 'File /Users/taohongyu/Desktop/takumi/README.md successfully edited.',
};

export default function EditRender({ message }: { message: ToolMessage }) {
  console.log('message', message);
  return <div>EditRender</div>;
}
