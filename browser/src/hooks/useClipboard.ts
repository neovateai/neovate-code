import { useCallback } from 'react';

export const useClipboard = () => {
  const writeText = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
  }, []);

  const readText = useCallback(async () => {
    return await navigator.clipboard.readText();
  }, []);

  return {
    readText,
    writeText,
  };
};
