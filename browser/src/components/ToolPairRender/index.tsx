import type React from 'react';
import type { UIToolPair } from '@/types/chat';
import AssistantToolMessage from '../AssistantMessage/AssistantToolMessage';
import ApprovalModal from '../AssistantMessage/ApprovalModal';
import styles from './index.module.css';

interface ToolPairRenderProps {
  pair: UIToolPair;
  uuid: string;
}

const ToolPairRender: React.FC<ToolPairRenderProps> = ({ pair, uuid }) => {
  if (!pair.toolResult) {
    return null;
  }

  return (
    <div className={styles.toolPairContainer}>
      {/* Render ToolUse */}
      <div className={styles.toolUse}>
        <AssistantToolMessage part={pair.toolUse} />
        <ApprovalModal part={pair.toolUse} />
      </div>

      {/* Render ToolResult if available */}
      <div className={styles.toolResult}>
        <AssistantToolMessage part={pair.toolResult} />
      </div>
    </div>
  );
};

export default ToolPairRender;
