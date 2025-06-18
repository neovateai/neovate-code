import React from 'react';
import {
  FileReadToolRenderer,
  GenericToolRenderer,
  ThinkToolRenderer,
} from '@/components/toolRender';
import type { ToolCallMessage } from '@/types/chat';
import styles from '../index.module.css';

interface ToolCallMessageRendererProps {
  message: ToolCallMessage;
  debugKey?: string;
}

// 解析结果为 JSON
const parseResult = (result: string): any => {
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
};

const ToolCallMessageRenderer: React.FC<ToolCallMessageRendererProps> = ({
  message,
  debugKey,
}) => {
  const { toolName, args, result } = message.content || message;

  // 根据工具名称和字段类型渲染特定格式
  const renderSpecificContent = (content: any, isArgs: boolean = false) => {
    if (!content) return null;

    const parsedContent =
      typeof content === 'string' ? parseResult(content) : content;
    const type = isArgs ? 'args' : 'result';

    switch (toolName) {
      case 'ThinkTool':
        if (parsedContent && typeof parsedContent.thought === 'string') {
          return <ThinkToolRenderer data={parsedContent} type={type} />;
        }
        break;

      case 'FileReadTool':
        if (
          parsedContent?.data &&
          typeof parsedContent.data?.content === 'string' &&
          typeof parsedContent.data?.filePath === 'string' &&
          typeof parsedContent.data?.totalLines === 'number'
        ) {
          return <FileReadToolRenderer data={parsedContent.data} type={type} />;
        }
        break;
    }

    // 如果不是特定工具或解析失败，使用通用渲染
    return (
      <GenericToolRenderer data={content} type={type} toolName={toolName} />
    );
  };

  return (
    <div className={styles.toolCall}>
      <div className={styles.toolCallTitle}>
        🔧 工具调用: {toolName}
        {debugKey && <span className={styles.debugKey}>({debugKey})</span>}
      </div>

      {args && (
        <div style={{ marginBottom: 8 }}>
          <div className={styles.paramLabel}>参数:</div>
          {renderSpecificContent(args, true)}
        </div>
      )}

      {result && (
        <div>
          <div className={styles.paramLabel}>结果:</div>
          {renderSpecificContent(result, false)}
        </div>
      )}
    </div>
  );
};

export default ToolCallMessageRenderer;
