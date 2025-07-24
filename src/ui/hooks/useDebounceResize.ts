import { debounce } from 'lodash-es';
import { useEffect, useRef, useState } from 'react';

const DEBOUNCE_TIME = 200;
const WIDTH_THRESHOLD = 3;

export function useDebounceResize() {
  const [forceRerender, setForceRerender] = useState(0);
  const lastWidthRef = useRef<number>(process.stdout.columns || 0);

  useEffect(() => {
    const onResize = debounce(() => {
      if (!process.stdout.isTTY) return;
      const currentWidth = process.stdout.columns || 0;
      const widthDiff = Math.abs(currentWidth - lastWidthRef.current);
      if (widthDiff > WIDTH_THRESHOLD) {
        lastWidthRef.current = currentWidth;
        process.stdout.write('\x1bc');
        setForceRerender((prev) => prev + 1);
      }
    }, DEBOUNCE_TIME);

    process.stdout.on('resize', onResize);
    return () => {
      process.stdout.off('resize', onResize);
      onResize.cancel();
    };
  }, []);

  return forceRerender;
}
