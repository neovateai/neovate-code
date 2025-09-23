import { useCallback } from 'react';
import { BASH_MODE_CONFIG } from './constants';
import { useAppStore } from './store';

export function useBashMode() {
  const { bashMode, setBashMode } = useAppStore();

  const enterBashMode = useCallback(() => {
    setBashMode(true);
  }, [setBashMode]);

  const exitBashMode = useCallback(() => {
    setBashMode(false);
  }, [setBashMode]);

  const toggleBashMode = useCallback(() => {
    setBashMode(!bashMode);
  }, [bashMode, setBashMode]);

  const detectBashModeFromInput = useCallback(
    (input: string): { shouldEnterBash: boolean; cleanedInput: string } => {
      if (input.startsWith(BASH_MODE_CONFIG.TRIGGER_CHAR) && !bashMode) {
        return {
          shouldEnterBash: true,
          cleanedInput: input.slice(1),
        };
      }
      return {
        shouldEnterBash: false,
        cleanedInput: input,
      };
    },
    [bashMode],
  );

  const shouldExitBashMode = useCallback(
    (input: string): boolean => {
      return (
        bashMode &&
        BASH_MODE_CONFIG.AUTO_EXIT_ON_EMPTY &&
        input.trim() === '' &&
        !input.startsWith(BASH_MODE_CONFIG.TRIGGER_CHAR)
      );
    },
    [bashMode],
  );

  const formatBashCommand = useCallback(
    (command: string): string => {
      if (bashMode && !command.startsWith(BASH_MODE_CONFIG.TRIGGER_CHAR)) {
        return `${BASH_MODE_CONFIG.TRIGGER_CHAR}${command}`;
      }
      return command;
    },
    [bashMode],
  );

  const handleBashModeInput = useCallback(
    (input: string): { processedInput: string; modeChanged: boolean } => {
      const detection = detectBashModeFromInput(input);

      if (detection.shouldEnterBash) {
        enterBashMode();
        return {
          processedInput: detection.cleanedInput,
          modeChanged: true,
        };
      }

      if (shouldExitBashMode(input)) {
        exitBashMode();
        return {
          processedInput: input,
          modeChanged: true,
        };
      }

      return {
        processedInput: input,
        modeChanged: false,
      };
    },
    [detectBashModeFromInput, shouldExitBashMode, enterBashMode, exitBashMode],
  );

  return {
    bashMode,
    enterBashMode,
    exitBashMode,
    toggleBashMode,
    detectBashModeFromInput,
    shouldExitBashMode,
    formatBashCommand,
    handleBashModeInput,
  };
}
