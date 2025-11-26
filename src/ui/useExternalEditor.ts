import { useCallback } from 'react';
import { openExternalEditor } from '../utils/externalEditor';

type UseExternalEditorProps = {
  value: string;
  onChange: (value: string) => void;
  setCursorPosition: (position: number) => void;
};

type UseExternalEditorResult = {
  handleExternalEdit: () => Promise<void>;
};

/**
 * Hook to handle external editor integration
 * Opens the current input value in an external editor and updates it with the result
 */
export function useExternalEditor({
  value,
  onChange,
  setCursorPosition,
}: UseExternalEditorProps): UseExternalEditorResult {
  const handleExternalEdit = useCallback(async () => {
    const result = await openExternalEditor(value);
    if (result !== null && result !== value) {
      onChange(result);
      setCursorPosition(result.length);
    }
  }, [value, onChange, setCursorPosition]);

  return { handleExternalEdit };
}
