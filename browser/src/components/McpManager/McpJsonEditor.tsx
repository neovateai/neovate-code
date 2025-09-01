import { Editor } from '@monaco-editor/react';
import { useState } from 'react';
import styles from './index.module.css';

interface McpJsonEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  height?: string;
  disabled?: boolean;
}

export const McpJsonEditor: React.FC<McpJsonEditorProps> = ({
  value = '',
  onChange,
  placeholder = '请输入MCP配置JSON',
  height = '200px',
  disabled = false,
}) => {
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (val: string | undefined) => {
    const newValue = val || '';

    // 验证JSON格式
    try {
      if (newValue.trim()) {
        JSON.parse(newValue);
      }
      setIsValid(true);
      setErrorMessage('');
    } catch (error) {
      setIsValid(false);
      setErrorMessage(error instanceof Error ? error.message : 'JSON格式错误');
    }

    onChange?.(newValue);
  };

  const handleEditorMount = (editor: any) => {
    // 根据placeholder判断是否为环境变量编辑器
    const isEnvEditor =
      placeholder?.includes('环境变量') || placeholder?.includes('environment');

    // 设置默认空对象
    if (!value.trim() && !disabled) {
      const emptyJson = {};
      const jsonString = JSON.stringify(emptyJson, null, 2);
      editor.setValue(jsonString);
      handleChange(jsonString);
    }

    // 自动格式化
    setTimeout(() => {
      editor.getAction('editor.action.formatDocument')?.run();
    }, 100);
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
