import { debounce } from 'lodash-es';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clearTerminal } from '../utils/terminal';

const DEBOUNCE_TIME = 200;
const WIDTH_THRESHOLD = 3;

export function useTerminalRefresh() {
  const [forceRerender, setForceRerender] = useState(0);
  const lastWidthRef = useRef<number>(process.stdout.columns || 0);

  useEffect(() => {
    const onResize = debounce(() => {
      if (!process.stdout.isTTY) return;
      const currentWidth = process.stdout.columns || 0;
      const widthDiff = Math.abs(currentWidth - lastWidthRef.current);
      if (widthDiff > WIDTH_THRESHOLD) {
        lastWidthRef.current = currentWidth;
        clearTerminal().catch((err) => {
          console.error('Failed to clear terminal:', err);
        });
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
