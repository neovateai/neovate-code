import Icon, { CloseOutlined, FileUnknownOutlined } from '@ant-design/icons';
import { Image, Popover, Tag } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import type { FileItem, ImageItem } from '@/api/model';
import * as codeViewer from '@/state/codeViewer';
import { diff } from '@/utils/codeViewer';
import DevFileIcon from '../DevFileIcon';

const useStyle = createStyles(({ css }) => {
  return {
    icon: css`
      margin-right: 4px;
      width: 12px;
      height: 12px;
    `,
    tag: css`
      user-select: none;
      margin: 0 2px;
      line-height: inherit;
    `,
  };
});

export const FileContextTag = ({
  displayText,
  onClose,
  context,
}: {
  displayText: string;
  onClose?: () => void;
  context?: FileItem;
}) => {
  const [hover, setHover] = useState(false);

  const { styles } = useStyle();

  const isFile = context?.type === 'file';

  return (
    <Tag
      color="blue"
      className={styles.tag}
      style={{ cursor: isFile ? 'pointer' : undefined }}
      data-ai-context-id="file"
      contentEditable={false}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={async () => {
        if (isFile) {
          const originalCode = `
          {
"common": {
"loading": "Loading...",
"error": "Error",
"success": "Success",
"cancel": "Cancel",
"confirm": "Confirm",
"save": "Save",
"delete": "Delete",
"edit": "Edit",
"rename": "Rename",
"search": "Search",
"placeholder": "Please input to search..."
},
"sidebar": {
"newConversation": "New Conversation",
"conversations": "Conversations",
"settings": "Settings",
"help": "Help"
},
"chat": {
"welcomeTitle": "Hello, I'm Takumi",
"welcomeDescription": "I'm your AI programming assistant, focused on improving development workflows. I can help you write code, optimize performance, generate tests, analyze architecture, and perform various development tasks~",
"quickStart": "Quick Start",
"capabilities": "Takumi Capabilities",
"greeting": "Hello, I'm Takumi, your AI programming assistant! How can I help you?",
"analyzeProject": "Help me analyze the code structure and architecture of this project",
"optimizeCode": "Optimize code performance and refactor this function",
"generateTests": "Generate unit test cases and test documentation",
"fixBugs": "Fix bugs and provide solutions",
"llmSupport": "LLM Support",
"llmSupportDesc": "Support for multiple LLM providers including OpenAI, Claude, Gemini, etc.",
"fileOperations": "File Operations",
"fileOperationsDesc": "Intelligently read, write and edit files, supporting multiple programming languages",
"codebaseNavigation": "Codebase Navigation",
"codebaseNavigationDesc": "Explore and search project code, quickly locate and analyze code structure",
"planMode": "Plan Mode",
"planModeDesc": "Break down complex tasks into manageable steps and execute plans step by step",
"sendMessage": "Send Message",
"thinking": "Thinking...",
"stopGenerating": "Stop Generating"
},
"prompts": {
"upgrades": "Upgrades",
"components": "Components",
"richGuide": "RICH Guide",
"installationIntro": "Installation Introduction"
},
"context": {
"addContext": "Add Context",
"files": "Files",
"selection": "Selection",
"terminal": "Terminal",
"git": "Git"
},
"menu": {
"rename": "Rename",
"delete": "Delete"
},
"codeViewer": {
"lineCount": "line(s)",
"charCount": "char(s)",
"tempFile": "Temporary File",
"copySuccess": "Copy content successfully"
}
}

        `;
          const modifiedCode = `
            {
  "common": {
    "loading": "加载中...",
    "error": "错误",
    "success": "成功",
    "cancel": "取消",
    "confirm": "确认",
    "save": "保存",
    "delete": "删除",
    "edit": "编辑",
    "rename": "重命名",
    "search": "搜索",
    "placeholder": "请输入搜索内容..."
  },
  "sidebar": {
    "newConversation": "新建对话",
    "conversations": "对话列表",
    "settings": "设置",
    "help": "帮助"
  },
  "chat": {
    "welcomeTitle": "你好，我是 Takumi",
    "welcomeDescription": "我是您的 AI 编程助手，专注于提升开发工作流程。我能帮助您编写代码、优化性能、生成测试、分析架构，以及执行各种开发任务～",
    "quickStart": "快速开始",
    "capabilities": "Takumi 能力",
    "greeting": "你好，我是 Takumi，你的 AI 编程助手！有什么可以帮助您的？",
    "analyzeProject": "帮我分析这个项目的代码结构和架构",
    "optimizeCode": "优化代码性能并重构这个函数",
    "generateTests": "生成单元测试用例和测试文档",
    "fixBugs": "修复 Bug 并提供解决方案",
    "llmSupport": "LLM 支持",
    "llmSupportDesc": "支持多种 LLM 提供商，包括 OpenAI、Claude、Gemini 等",
    "fileOperations": "文件操作",
    "fileOperationsDesc": "智能读取、编写和编辑文件，支持多种编程语言",
    "codebaseNavigation": "代码库导航",
    "codebaseNavigationDesc": "探索和搜索项目代码，快速定位和分析代码结构",
    "planMode": "计划模式",
    "planModeDesc": "将复杂任务分解为可管理的步骤，逐步执行计划",
    "sendMessage": "发送消息",
    "thinking": "思考中...",
    "stopGenerating": "停止生成"
  },
  "prompts": {
    "upgrades": "升级",
    "components": "组件",
    "richGuide": "详细指南",
    "installationIntro": "安装介绍"
  },
  "context": {
    "addContext": "添加上下文",
    "files": "文件",
    "selection": "选择",
    "terminal": "终端",
    "git": "Git"
  },
  "menu": {
    "rename": "重命名",
    "delete": "删除"
  },
  "codeViewer": {
    "lineCount": "行",
    "charCount": "个字符",
    "tempFile": "临时文件",
    "copySuccess": "复制成功"
  }
}
`;
          codeViewer.actions.displayDiffViewer({
            path: '123.json',
            originalCode,
            modifiedCode,
            language: 'json',
            diffStat: await diff(originalCode, modifiedCode),
          });
          codeViewer.actions.displayNormalViewer({
            path: displayText,
            code: '// TODO',
          });
        }
      }}
    >
      {onClose && hover ? (
        <CloseOutlined
          className={styles.icon}
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
        />
      ) : (
        <DevFileIcon
          isFolder={!isFile}
          className={styles.icon}
          fileExt={displayText.split('.').pop() ?? ''}
        />
      )}
      {displayText}
    </Tag>
  );
};

export const AttachmentContextTag = ({
  displayText,
  onClose,
}: {
  displayText: string;
  onClose?: () => void;
}) => {
  const [hover, setHover] = useState(false);
  const { styles } = useStyle();

  return (
    <Tag
      color="purple"
      className={styles.tag}
      data-ai-context-id="attachment"
      contentEditable={false}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {onClose && hover ? (
        <CloseOutlined className={styles.icon} onClick={onClose} />
      ) : (
        <FileUnknownOutlined className={styles.icon} />
      )}
      {displayText}
    </Tag>
  );
};

export const ImageContextTag = ({
  displayText,
  onClose,
  context,
}: {
  displayText: string;
  onClose?: () => void;
  context?: ImageItem;
}) => {
  const [hover, setHover] = useState(false);
  const { styles } = useStyle();

  return (
    <Popover
      popupVisible={hover}
      content={
        <Image
          style={{
            maxHeight: 600,
            maxWidth: 600,
          }}
          src={context?.src}
          preview={false}
        />
      }
    >
      <Tag
        color="cyan"
        className={styles.tag}
        data-ai-context-id="image"
        contentEditable={false}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {onClose && hover ? (
          <CloseOutlined className={styles.icon} onClick={onClose} />
        ) : (
          <Icon
            className={styles.icon}
            component={() => (
              <Image
                src={context?.src}
                width={12}
                height={12}
                preview={false}
              />
            )}
          />
        )}
        {displayText}
      </Tag>
    </Popover>
  );
};
