import { useCallback, useEffect, useRef } from 'react';
import { useModeSwitch } from './useModeSwitch';

interface UseKeyboardShortcutsProps {
  onCtrlCPressed: (pressed: boolean) => void;
  onShowExitWarning: (show: boolean) => void;
}

export function useKeyboardShortcuts({
  onCtrlCPressed,
  onShowExitWarning,
}: UseKeyboardShortcutsProps) {
  const { switchMode, switchToPrompt } = useModeSwitch();
  const ctrlCTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (ctrlCTimeoutRef.current) {
        clearTimeout(ctrlCTimeoutRef.current);
      }
    };
  }, []);

  const handleExitMessage = useCallback(
    (show: boolean, key?: string) => {
      if (show) {
        onShowExitWarning(true);
        onCtrlCPressed(true);
        // Reset after 1 second
        if (ctrlCTimeoutRef.current) {
          clearTimeout(ctrlCTimeoutRef.current);
        }
        ctrlCTimeoutRef.current = setTimeout(() => {
          onCtrlCPressed(false);
          onShowExitWarning(false);
          ctrlCTimeoutRef.current = null;
        }, 1000);
      } else {
        onShowExitWarning(false);
        onCtrlCPressed(false);
      }
    },
    [onShowExitWarning, onCtrlCPressed],
  );

  const handleShiftTab = useCallback(() => {
    switchMode();
  }, [switchMode]);

  const handleEscapeFromBash = useCallback(() => {
    switchToPrompt();
  }, [switchToPrompt]);

  return {
    handleExitMessage,
    handleShiftTab,
    handleEscapeFromBash,
  };
}
