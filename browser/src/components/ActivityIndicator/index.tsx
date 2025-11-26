import { useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { createStyles } from 'antd-style';
import { state } from '@/state/chat';

const useStyles = createStyles(({ css }) => ({
  container: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
  `,

  statusText: css`
    font-size: 14px;
    font-weight: 400;
    color: #110c22;
    line-height: 20px;
  `,

  info: css`
    font-size: 12px;
    font-weight: 400;
    color: #8c8c8c;
    line-height: 20px;
  `,

  errorText: css`
    font-size: 14px;
    font-weight: 400;
    color: #ff4d4f;
    line-height: 20px;
  `,
}));

const ActivityIndicator = () => {
  const { styles } = useStyles();
  const { status, error, approvalModal, processingTokens } = useSnapshot(state);

  const text = useMemo(() => {
    if (status === 'processing') return 'Processing...';
    if (status === 'planning') return 'Planning...';
    if (status === 'tool_executing') return 'Executing...';
    if (status === 'compacting') return 'Compacting...';
    if (status === 'slash_command_executing') return 'Executing command...';
    if (status === 'failed') return `Failed: ${error}`;
    return 'Processing...';
  }, [status, error]);

  const additionalInfo = useMemo(() => {
    const infoParts: string[] = [];

    // Add token count if available
    if (
      processingTokens > 0 &&
      (status === 'processing' ||
        status === 'planning' ||
        status === 'tool_executing' ||
        status === 'compacting')
    ) {
      infoParts.push(`${processingTokens} tokens`);
    }

    // Add cancel hint
    if (
      status === 'processing' ||
      status === 'planning' ||
      status === 'tool_executing' ||
      status === 'slash_command_executing'
    ) {
      infoParts.push('Esc to cancel');
    }

    return infoParts.length > 0 ? `(${infoParts.join(' • ')})` : null;
  }, [status, processingTokens]);

  // Only show for active processing states
  if (status === 'idle') return null;
  if (status === 'exit') return null;
  if (status === 'failed') return null;
  if (status === 'cancelled') return null;
  if (approvalModal) return null;

  return (
    <div className={styles.container}>
      <span className={styles.statusText}>{text}</span>
      {additionalInfo && <span className={styles.info}>{additionalInfo}</span>}
    </div>
  );
};

export default ActivityIndicator;
