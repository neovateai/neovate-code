import { Editor } from '@monaco-editor/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { McpJsonEditorProps } from '@/types/mcp';
import styles from './index.module.css';

export const McpJsonEditor: React.FC<McpJsonEditorProps> = ({
  value = '',
  onChange,
  height = '200px',
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (val: string | undefined) => {
    const newValue = val || '';

    // Validate JSON format
    try {
      if (newValue.trim()) {
        JSON.parse(newValue);
      }
      setIsValid(true);
      setErrorMessage('');
    } catch (error) {
      setIsValid(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('mcp.jsonFormatErrorMessage'),
      );
    }

    onChange?.(newValue);
  };

  const handleEditorMount = (editor: any) => {
    // Set default empty object
    if (!value.trim() && !disabled) {
      const emptyJson = {};
      const jsonString = JSON.stringify(emptyJson, null, 2);
      editor.setValue(jsonString);
      handleChange(jsonString);
    }
  };

  return (
    <div
      className={`${styles.jsonEditor} ${!isValid ? styles.jsonEditorError : ''}`}
    >
      <Editor
        height={height}
        defaultLanguage="json"
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          lineNumbers: 'on',
          formatOnPaste: true,
          formatOnType: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          bracketPairColorization: { enabled: true },
          foldingHighlight: true,
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true,
          },
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: false,
          readOnly: disabled,
        }}
        theme="vs"
      />
      {!isValid && (
        <div className={styles.jsonEditorErrorMessage}>
          <span className={styles.errorIcon}>⚠️</span>
          {errorMessage}
        </div>
      )}
    </div>
  );
};
