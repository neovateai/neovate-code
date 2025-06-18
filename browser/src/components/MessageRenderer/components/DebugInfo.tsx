import React, { useState } from 'react';
import type { BubbleMessage } from '@/types/chat';
import { MessageType } from '@/types/chat';
import styles from '../index.module.css';

interface DebugInfoProps {
  message: BubbleMessage | string;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ message }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 只在开发环境显示
  const isDevelopment =
    process.env.NODE_ENV === 'development' ||
    process.env.REACT_APP_ENV === 'development' ||
    // 额外检测 localhost 和常见的开发端口
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('dev')));

  if (!isDevelopment) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // 格式化消息数据，移除敏感信息或过长的内容
  const formatMessageForDebug = (msg: BubbleMessage | string) => {
    try {
      const debugData: Record<string, unknown> = {
        messageType: typeof msg,
      };

      if (typeof msg === 'string') {
        debugData.stringLength = msg.length;
        debugData.preview =
          msg.length > 100 ? msg.substring(0, 100) + '...' : msg;
        debugData.fullContent = msg;
      } else if (msg && typeof msg === 'object') {
        debugData.objectKeys = Object.keys(msg);
        debugData.hasType = 'type' in msg;

        if (msg.type) {
          debugData.messageTypeProperty = msg.type;
        }

        // 对于混合消息，显示结构信息
        if (msg.type === MessageType.MIXED) {
          debugData.mixedInfo = {
            hasTextContent: !!msg.content,
            nonTextMessagesCount: msg.nonTextMessages
              ? msg.nonTextMessages.length
              : 0,
          };
        }

        debugData.fullData = msg;
      } else {
        debugData.value = msg;
      }

      return JSON.stringify(debugData, null, 2);
    } catch (error) {
      return `调试信息格式化失败: ${error}`;
    }
  };

  return (
    <div className={styles.debugContainer}>
      <div className={styles.debugToggle} onClick={toggleExpanded}>
        <span
          className={`${styles.debugToggleIcon} ${
            isExpanded ? styles.debugToggleIconExpanded : ''
          }`}
        >
          ▶
        </span>
        <span>调试信息 (开发环境)</span>
        <span style={{ marginLeft: 'auto', fontSize: '10px' }}>
          {typeof message === 'string' ? '字符串' : `对象 (${typeof message})`}
        </span>
      </div>

      {isExpanded && (
        <div className={styles.debugContent}>
          <pre className={styles.debugJson}>
            {formatMessageForDebug(message)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DebugInfo;
