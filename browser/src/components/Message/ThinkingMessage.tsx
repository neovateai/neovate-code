import { CheckCircleFilled, DownOutlined, UpOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import type { ReasoningMessage } from '@/types/message';

const useStyles = createStyles(({ token, css }) => ({
  thinkingContainer: css`
    margin: ${token.marginSM}px 0;
  `,

  thinkingHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${token.paddingXS}px 0;
    cursor: pointer;
    user-select: none;

    &:hover .expand-icon {
      color: ${token.colorText};
    }
  `,

  headerLeft: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
  `,

  statusIcon: css`
    color: #52c41a;
    font-size: ${token.fontSize}px;
  `,

  thinkingLabel: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    font-weight: 500;
  `,

  expandIcon: css`
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
    transition: color ${token.motionDurationMid};
  `,

  thinkingContent: css`
    overflow: hidden;
    transition: max-height ${token.motionDurationMid} ease;
    padding-left: ${token.marginLG}px;
  `,

  reasoningText: css`
    color: ${token.colorTextTertiary};
    line-height: ${token.lineHeight};
    font-size: ${token.fontSizeSM}px;
    word-break: break-word;
    white-space: pre-wrap;
    margin: ${token.marginXS}px 0 0 0;
    border-left: 2px solid ${token.colorBorderSecondary};
    padding-left: ${token.paddingSM}px;
  `,

  collapsedContent: css`
    max-height: 0;
    overflow: hidden;
  `,

  expandedContent: css`
    max-height: 800px;
  `,
}));

const ThinkingMessage: React.FC<{ message: ReasoningMessage }> = ({
  message,
}) => {
  const { styles } = useStyles();
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={styles.thinkingContainer}>
      <div className={styles.thinkingHeader} onClick={toggleExpanded}>
        <div className={styles.headerLeft}>
          <CheckCircleFilled className={styles.statusIcon} />
          <span className={styles.thinkingLabel}>Thinking</span>
        </div>

        <div className={`${styles.expandIcon} expand-icon`}>
          {isExpanded ? <UpOutlined /> : <DownOutlined />}
        </div>
      </div>

      <div
        className={`${styles.thinkingContent} ${isExpanded ? styles.expandedContent : styles.collapsedContent}`}
      >
        <div className={styles.reasoningText}>{message.reasoning}</div>
      </div>
    </div>
  );
};

export default ThinkingMessage;
