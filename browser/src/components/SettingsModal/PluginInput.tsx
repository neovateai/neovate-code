import React, { type KeyboardEvent, useRef, useState } from 'react';
import deleteIcon from '@/icons/delete-icon.svg';

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
      <div
        className="w-full min-h-[102px] p-1 bg-white border border-[#DCDDE0] rounded cursor-text"
        onClick={handleContainerClick}
      >
        {/* Plugin tags and input area */}
        <div className="flex flex-wrap gap-1 items-start p-1">
          {/* Existing plugin tags */}
          {value.map((plugin, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1 px-1.5 py-1 border border-[#EEEFF0] rounded-sm text-xs text-[#252931] font-normal"
              style={{
                fontFamily: 'PingFang SC',
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
              }}
            >
              <span className="leading-4">{plugin}</span>
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
                  className="w-2 h-2"
                  style={{
                    filter:
                      'invert(47%) sepia(6%) saturate(347%) hue-rotate(182deg) brightness(95%) contrast(87%)',
                  }}
                />
              </button>
            </div>
          ))}

          {/* Input field and cursor */}
          <div
            className="flex items-center relative flex-1"
            style={{ minWidth: '120px' }}
          >
            {/* 隐藏的测量元素 */}
            <span
              ref={measureRef}
              className="absolute opacity-0 pointer-events-none text-sm"
              style={{
                fontFamily: 'PingFang SC',
                fontSize: '14px',
                lineHeight: '20px',
                whiteSpace: 'pre',
              }}
            >
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
              className="bg-transparent outline-none border-none text-sm text-[#110C22] placeholder-[#AAABAF] w-full"
              style={{
                fontFamily: 'PingFang SC',
                fontSize: '14px',
                lineHeight: '20px',
                caretColor: 'transparent', // 隐藏原生光标
              }}
              placeholder={value.length === 0 && !isTyping ? placeholder : ''}
            />

            {/* Blinking cursor when typing */}
            {isTyping && (
              <div
                className="absolute w-px h-4 bg-[#110C22] pointer-events-none"
                style={{
                  animation: 'blink 1s infinite',
                  left: `${cursorPosition}px`,
                  top: '2px', // 向下移动一点与tag对齐
                }}
              />
            )}
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `,
        }}
      />
    </div>
  );
};

export default PluginInput;
