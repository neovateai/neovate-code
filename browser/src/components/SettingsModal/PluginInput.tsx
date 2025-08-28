import React, { type KeyboardEvent, useRef, useState } from 'react';
import deleteIcon from '@/icons/delete-icon.svg';
import styles from './index.module.css';

interface PluginInputProps {
  value: string[];
  onChange: (plugins: string[]) => void;
  placeholder?: string;
}

const PluginInput: React.FC<PluginInputProps> = ({
  value = [],
  onChange,
  placeholder = '请输入插件名称或路径',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Focus input when component mounts or when user clicks the container
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  // Handle Enter key to add plugin
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newPlugin = inputValue.trim();
      if (!value.includes(newPlugin)) {
        onChange([...value, newPlugin]);
      }
      setInputValue('');
      setCursorPosition(0); // 重置光标位置
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Delete last plugin when backspace is pressed and input is empty
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // 更新光标位置
    requestAnimationFrame(() => {
      if (measureRef.current) {
        setCursorPosition(measureRef.current.offsetWidth);
      }
    });
  };

  // Remove specific plugin
  const removePlugin = (index: number) => {
    const newPlugins = value.filter((_, i) => i !== index);
    onChange(newPlugins);
  };

  // Handle input focus
  const handleFocus = () => {
    setIsTyping(true);
    // 更新光标位置
    requestAnimationFrame(() => {
      if (measureRef.current) {
        setCursorPosition(measureRef.current.offsetWidth);
      }
    });
  };

  // Handle input blur
  const handleBlur = () => {
    setIsTyping(false);
    // Auto-add plugin if there's text when blur occurs
    if (inputValue.trim()) {
      const newPlugin = inputValue.trim();
      if (!value.includes(newPlugin)) {
        onChange([...value, newPlugin]);
      }
      setInputValue('');
      setCursorPosition(0);
    }
  };

  return (
    <div className="relative">
      {/* Main container */}
      <div className={styles.pluginContainer} onClick={handleContainerClick}>
        {/* Plugin tags and input area */}
        <div className={styles.pluginTagsArea}>
          {/* Existing plugin tags */}
          {value.map((plugin, index) => (
            <div key={index} className={styles.pluginTag}>
              <span className={styles.pluginTagText}>{plugin}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removePlugin(index);
                }}
              >
                <img
                  src={deleteIcon}
                  alt="删除"
                  className={styles.deleteIcon}
                />
              </button>
            </div>
          ))}

          {/* Input field and cursor */}
          <div className={styles.inputWrapper}>
            {/* 隐藏的测量元素 */}
            <span ref={measureRef} className={styles.measureSpan}>
              {inputValue}
            </span>

            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className={styles.pluginInput}
              placeholder={value.length === 0 && !isTyping ? placeholder : ''}
            />

            {/* Blinking cursor when typing */}
            {isTyping && (
              <div
                className={styles.blinkingCursor}
                style={{
                  left: `${cursorPosition}px`,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginInput;
