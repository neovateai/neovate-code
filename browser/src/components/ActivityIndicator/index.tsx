import { useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { state } from '@/state/chat';
import GradientText from './GradientText';

const ActivityIndicator = () => {
  const { status, processingTokens, error, approvalModal } = useSnapshot(state);

  const text = useMemo(() => {
    if (status === 'processing') return 'Processing';
    if (status === 'failed') return `Failed: ${error}`;
    return 'Processing';
  }, [status, error]);

  const additionalInfo = useMemo(() => {
    if (status === 'processing') {
      const tokenText =
        processingTokens > 0 ? `↓ ${processingTokens} tokens` : '';
      return `(Esc to cancel${tokenText ? `, ${tokenText}` : ''})`;
    }
    return null;
  }, [status, processingTokens]);

  if (status === 'idle') return null;
  if (status === 'exit') return null;
  if (approvalModal) return null;

  return (
    <div className="inline-flex items-center rounded-lg text-sm backdrop-blur-sm ml-2">
      {status === 'processing' ? (
        <>
          <GradientText
            text={text}
            speed={100}
            isActive={true}
            className="text-sm font-semibold"
          />
          <span className="text-gray-600 dark:text-gray-400 font-medium">
            ...
          </span>
          {additionalInfo && (
            <span className="text-gray-500 dark:text-gray-400 text-xs ml-3 font-medium">
              {additionalInfo}
            </span>
          )}
        </>
      ) : (
        <span className="font-semibold text-red-500">{text}</span>
      )}
    </div>
  );
};

export default ActivityIndicator;
