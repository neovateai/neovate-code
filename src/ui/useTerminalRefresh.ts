import { debounce } from 'lodash-es';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clearTerminal } from '../utils/terminal';

const DEBOUNCE_TIME = 500;
const WIDTH_THRESHOLD = 1;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useTerminalRefresh() {
  const [forceRerender, setForceRerender] = useState(0);
  const lastWidthRef = useRef<number>(process.stdout.columns || 0);

  useEffect(() => {
    const onResize = debounce(async () => {
      if (!process.stdout.isTTY) return;
      const currentWidth = process.stdout.columns || 0;
      const widthDiff = currentWidth - lastWidthRef.current;
      if (Math.abs(widthDiff) > WIDTH_THRESHOLD) {
        lastWidthRef.current = currentWidth;

        await clearTerminal();
        await delay(20);
        setForceRerender((prev) => prev + 1);
      }
    }, DEBOUNCE_TIME);

    process.stdout.on('resize', onResize);
    return () => {
      process.stdout.off('resize', onResize);
      onResize.cancel();
    };
  }, []);

  const forceUpdate = useCallback(() => {
    clearTerminal().catch((err) => {
      console.error('Failed to clear terminal:', err);
    });
    setForceRerender((prev) => prev + 1);
  }, []);

  return {
    forceRerender,
    forceUpdate,
  };
}
