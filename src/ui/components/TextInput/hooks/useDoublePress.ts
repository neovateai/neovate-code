import { useRef } from 'react';

export const DOUBLE_PRESS_TIMEOUT_MS = 1000;

export function useDoublePress(
  setPending: (pending: boolean) => void,
  onDoublePress: () => void,
  onFirstPress?: () => void,
): () => void {
  const lastPressRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return () => {
    const now = Date.now();
    const timeSinceLastPress = now - lastPressRef.current;

    // For this to count as a double-call, be sure to check that
    // timeoutRef.current exists so we don't trigger on triple call
    // (e.g. of Esc to clear the text input)
    if (timeSinceLastPress <= DOUBLE_PRESS_TIMEOUT_MS && timeoutRef.current) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      onDoublePress();
      setPending(false);
    } else {
      if (onFirstPress) {
        onFirstPress();
      }
      setPending(true);
      timeoutRef.current = setTimeout(
        () => setPending(false),
        DOUBLE_PRESS_TIMEOUT_MS,
      );
    }

    lastPressRef.current = now;
  };
}
