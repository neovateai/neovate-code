import { CodeOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { ToolMessage, UIMessageType } from '@/types/message';

const mockData: ToolMessage = {
  type: 'tool' as UIMessageType.Tool,
  toolCallId: 'e4b8edc4-c624-4603-b9ce-a5bee69eff5b',
  toolName: 'glob',
  args: {
    pattern: '**/*.{ts,tsx,js,jsx,json,md}',
    path: '/Users/taohongyu/Desktop/takumi',
  },
  state: 'result',
  step: 1,
  result: {
    success: true,
    data: {
      filenames: [
        '/Users/taohongyu/Desktop/takumi/CHANGELOG.md',
        '/Users/taohongyu/Desktop/takumi/README.md',
        '/Users/taohongyu/Desktop/takumi/TAKUMI.md',
        '/Users/taohongyu/Desktop/takumi/api-extractor.json',
        '/Users/taohongyu/Desktop/takumi/docs/as-mcp.md',
        '/Users/taohongyu/Desktop/takumi/docs/commands.md',
        '/Users/taohongyu/Desktop/takumi/docs/llms.md',
        '/Users/taohongyu/Desktop/takumi/docs/plugin.md',
        '/Users/taohongyu/Desktop/takumi/src/utils/execFileNoThrow.ts',
        '/Users/taohongyu/Desktop/takumi/src/utils/logger.ts',
        '/Users/taohongyu/Desktop/takumi/src/utils/markdown.ts',
        '/Users/taohongyu/Desktop/takumi/browser/dist/layouts__index.async.js',
        '/Users/taohongyu/Desktop/takumi/browser/dist/283.async.js',
        '/Users/taohongyu/Desktop/takumi/browser/dist/p__Chat__index.async.js',
        '/Users/taohongyu/Desktop/takumi/browser/dist/993.async.js',
        '/Users/taohongyu/Desktop/takumi/browser/dist/961.async.js',
        '/Users/taohongyu/Desktop/takumi/browser/dist/596.async.js',
        '/Users/taohongyu/Desktop/takumi/browser/dist/umi.js',
        '/Users/taohongyu/Desktop/takumi/browser/dist/preload_helper.js',
        '/Users/taohongyu/Desktop/takumi/browser/package.json',
        '/Users/taohongyu/Desktop/takumi/browser/src/api/fileService.ts',
        '/Users/taohongyu/Desktop/takumi/browser/src/api/model.ts',
        '/Users/taohongyu/Desktop/takumi/browser/src/components/AssistantMessage/AssistantTextMessage.tsx',
        '/Users/taohongyu/Desktop/takumi/browser/src/components/AssistantMessage/AssistantThinkingMessage.tsx',
        '/Users/taohongyu/Desktop/takumi/browser/src/components/AssistantMessage/index.tsx',
        '/Users/taohongyu/Desktop/takumi/browser/src/components/ChatSender/SenderHeader/index.tsx',
        '/Users/taohongyu/Desktop/takumi/browser/src/components/ChatSender/index.tsx',
        '/Users/taohongyu/Desktop/takumi/browser/src/components/MarkdownRenderer/index.tsx',
        '/Users/taohongyu/Desktop/takumi/browser/src/components/Sider/index.tsx',
        '/Users/taohongyu/Desktop/takumi/browser/src/constants/chat.ts',
        '/Users/taohongyu/Desktop/takumi/browser/src/hooks/provider.tsx',
        '/Users/taohongyu/Desktop/takumi/browser/src/hooks/useStableValue.ts',
        '/Users/taohongyu/Desktop/takumi/browser/src/hooks/useSuggestion.tsx',
        '/Users/taohongyu/Desktop/takumi/browser/src/index.tsx',
        '/Users/taohongyu/Desktop/takumi/browser/src/pages/__root.tsx',
        '/Users/taohongyu/Desktop/takumi/browser/src/pages/demo.tsx',
        '/Users/taohongyu/Desktop/takumi/browser/src/routeTree.gen.ts',
        '/Users/taohongyu/Desktop/takumi/browser/src/state/context.ts',
        '/Users/taohongyu/Desktop/takumi/browser/src/state/message.ts',
        '/Users/taohongyu/Desktop/takumi/browser/src/state/sender.ts',
        '/Users/taohongyu/Desktop/takumi/browser/src/state/suggestion.ts',
        '/Users/taohongyu/Desktop/takumi/browser/src/types/message.ts',
        '/Users/taohongyu/Desktop/takumi/browser/src/utils/mergeMessages.ts',
        '/Users/taohongyu/Desktop/takumi/browser/src/utils/request.ts',
        '/Users/taohongyu/Desktop/takumi/browser/src/vite-env.d.ts',
        '/Users/taohongyu/Desktop/takumi/browser/tsconfig.app.json',
        '/Users/taohongyu/Desktop/takumi/browser/tsconfig.json',
        '/Users/taohongyu/Desktop/takumi/browser/tsconfig.node.json',
        '/Users/taohongyu/Desktop/takumi/browser/typings.d.ts',
        '/Users/taohongyu/Desktop/takumi/fixtures/normal/a.ts',
        '/Users/taohongyu/Desktop/takumi/fixtures/normal/b/c.ts',
        '/Users/taohongyu/Desktop/takumi/fixtures/normal/package.json',
        '/Users/taohongyu/Desktop/takumi/src/agents/code.ts',
        '/Users/taohongyu/Desktop/takumi/src/agents/commit.ts',
        '/Users/taohongyu/Desktop/takumi/src/agents/plan.ts',
        '/Users/taohongyu/Desktop/takumi/src/agents/shell.ts',
        '/Users/taohongyu/Desktop/takumi/src/cli.ts',
        '/Users/taohongyu/Desktop/takumi/src/codebase.ts',
        '/Users/taohongyu/Desktop/takumi/src/commands/__test.tsx',
        '/Users/taohongyu/Desktop/takumi/src/commands/commit.ts',
        '/Users/taohongyu/Desktop/takumi/src/commands/config.ts',
        '/Users/taohongyu/Desktop/takumi/src/commands/default-fc.ts',
        '/Users/taohongyu/Desktop/takumi/src/commands/default.tsx',
        '/Users/taohongyu/Desktop/takumi/src/commands/mcp.ts',
        '/Users/taohongyu/Desktop/takumi/src/commands/run.ts',
        '/Users/taohongyu/Desktop/takumi/src/config.ts',
        '/Users/taohongyu/Desktop/takumi/src/constants.ts',
        '/Users/taohongyu/Desktop/takumi/src/context.ts',
        '/Users/taohongyu/Desktop/takumi/src/ide.ts',
        '/Users/taohongyu/Desktop/takumi/src/index.ts',
        '/Users/taohongyu/Desktop/takumi/src/mcp.ts',
        '/Users/taohongyu/Desktop/takumi/src/normal.test.skip.ts',
        '/Users/taohongyu/Desktop/takumi/src/plugin.ts',
        '/Users/taohongyu/Desktop/takumi/src/prompt-context.ts',
        '/Users/taohongyu/Desktop/takumi/src/query.ts',
        '/Users/taohongyu/Desktop/takumi/src/server/config.ts',
        '/Users/taohongyu/Desktop/takumi/src/server/context/context-files.ts',
        '/Users/taohongyu/Desktop/takumi/src/server/prompts.ts',
        '/Users/taohongyu/Desktop/takumi/src/server/routes/completions.test.ts',
        '/Users/taohongyu/Desktop/takumi/src/server/routes/completions.ts',
        '/Users/taohongyu/Desktop/takumi/src/server/routes/files.ts',
        '/Users/taohongyu/Desktop/takumi/src/server/server.ts',
        '/Users/taohongyu/Desktop/takumi/src/server/services/completions.ts',
        '/Users/taohongyu/Desktop/takumi/src/server/types/completions.ts',
        '/Users/taohongyu/Desktop/takumi/src/server/types/files.ts',
        '/Users/taohongyu/Desktop/takumi/src/server/types/index.ts',
        '/Users/taohongyu/Desktop/takumi/src/server/types/server.ts',
        '/Users/taohongyu/Desktop/takumi/src/service.ts',
        '/Users/taohongyu/Desktop/takumi/src/tool.ts',
        '/Users/taohongyu/Desktop/takumi/src/tools/bash.ts',
        '/Users/taohongyu/Desktop/takumi/src/tools/edit.ts',
        '/Users/taohongyu/Desktop/takumi/src/tools/fetch.ts',
        '/Users/taohongyu/Desktop/takumi/src/tools/glob.ts',
        '/Users/taohongyu/Desktop/takumi/src/tools/grep.ts',
        '/Users/taohongyu/Desktop/takumi/src/tools/ls.ts',
        '/Users/taohongyu/Desktop/takumi/src/tools/read.ts',
        '/Users/taohongyu/Desktop/takumi/src/tools/write.ts',
        '/Users/taohongyu/Desktop/takumi/src/tracing.ts',
        '/Users/taohongyu/Desktop/takumi/src/ui/app.tsx',
        '/Users/taohongyu/Desktop/takumi/src/ui/ink-markdown.tsx',
      ],
      durationMs: 6,
      numFiles: 100,
      truncated: true,
      message: 'Found 100 files in 6ms, truncating to 100.',
    },
  },
};

export default function GlobRender({ message }: { message?: ToolMessage }) {
  const data = message || mockData;
  const { toolName, result } = data;
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const renderContent = () => {
    if (typeof result === 'string') {
      return <pre className="text-xs">{result}</pre>;
    }

    if (
      result &&
      typeof result === 'object' &&
      'data' in result &&
      result.data &&
      typeof result.data === 'object' &&
      'filenames' in result.data &&
      Array.isArray((result.data as any).filenames)
    ) {
      const { filenames, message } = result.data as {
        filenames: string[];
        message?: string;
      };

      return (
        <div>
          {message && <p className="text-xs text-gray-500 mb-1">{message}</p>}
          <ul className="list-none m-0 p-0">
            {filenames.map((filename, index) => (
              <li
                key={index}
                className="text-xs truncate p-1 rounded cursor-pointer hover:bg-gray-100"
              >
                {filename}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (typeof result === 'object' && result !== null) {
      return <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>;
    }
    return null;
  };

  return (
    <div className="text-sm">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={toggleExpand}
      >
        <span className="transition-transform duration-300">
          {isExpanded ? <DownOutlined /> : <RightOutlined />}
        </span>
        <CodeOutlined />
        <span>{toolName}</span>
      </div>
      <div
        className={`pl-6 mt-1 overflow-hidden transition-[max-height] duration-500 ease-in-out ${
          isExpanded ? 'max-h-screen' : 'max-h-0'
        }`}
      >
        <div className="overflow-y-auto max-h-60 bg-gray-50 p-2 rounded">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
