import { Spin } from 'antd';
import { createStyles } from 'antd-style';
import type { ReasoningMessage } from '@/types/message';

const useStyles = createStyles(({ token, css }) => ({
  thinkingContainer: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    padding: ${token.paddingSM}px ${token.padding}px;
    background: ${token.colorFillAlter};
    border-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorder};
    box-shadow: ${token.boxShadowTertiary};
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    transition: all ${token.motionDurationSlow};

    &:hover {
      border-color: ${token.colorPrimaryBorder};
      box-shadow: ${token.boxShadowSecondary};
    }
  `,
  thinkingLabel: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
    color: ${token.colorTextTertiary};
    font-weight: ${token.fontWeightStrong};
    white-space: nowrap;
  `,
  reasoningText: css`
    color: ${token.colorText};
    line-height: ${token.lineHeight};
    word-break: break-word;
  `,
}));

const ThinkingMessage: React.FC<{ message: ReasoningMessage }> = ({
  message,
}) => {
  const { styles } = useStyles();

  return (
    <div className={styles.thinkingContainer}>
      <span className={styles.thinkingLabel}>
        <Spin size="small" />
        思考中...
      </span>
      <span className={styles.reasoningText}>{message.reasoning}</span>
    </div>
  );
};

export default ThinkingMessage;
