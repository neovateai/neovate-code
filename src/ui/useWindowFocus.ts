import { useCallback, useEffect, useState } from 'react';

export function useWindowFocus(): {
  isWindowFocused: boolean;
  handleFocusChange: (focused: boolean) => void;
} {
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  useEffect(() => {
    if (!process.stdin.isTTY) return;

    process.stdout.write('\x1b[?1004h');

    return () => {
      process.stdout.write('\x1b[?1004l');
    };
  }, []);

  const handleFocusChange = useCallback((focused: boolean) => {
    setIsWindowFocused(focused);
  }, []);

  return { isWindowFocused, handleFocusChange };
}
