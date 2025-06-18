import { PlusOutlined } from '@ant-design/icons';
import { Input, type InputRef, Tag } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import Suggestion from '@/components/Suggestion';
import { ContextType } from '@/constants/ContextType';
import { AI_CONTEXT_NODE_CONFIGS } from '@/constants/aiContextNodeConfig';
import { useSuggestion } from '@/hooks/useSuggestion';
import * as context from '@/state/context';

const useStyle = createStyles(({ css }) => {
  return {
    tag: css`
      user-select: none;
      cursor: pointer;
      border-style: dashed;
      background-color: inherit;
      line-height: inherit;
      margin-right: 0;
    `,
    input: css`
      /* margin-right: 8px; */
    `,
  };
});

const AddContext = () => {
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setinputValue] = useState('');
  const inputRef = useRef<InputRef>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const { selectContexts, contextsSelectedValues } = useSnapshot(context.state);
  const [tagSize, setTagSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (inputVisible) {
      inputRef.current?.focus();
    }
  }, [inputVisible]);

  useLayoutEffect(() => {
    const rect = tagRef.current?.getBoundingClientRect();
    setTagSize({
      width: rect?.width || 0,
      height: rect?.height || 0,
    });
  }, []);

  const { suggestions, getTypeByValue, getFileByValue } = useSuggestion(
    inputValue,
    contextsSelectedValues,
  );

  const { styles } = useStyle();

  return (
    <Suggestion
      items={suggestions}
      onSelect={(value) => {
        const type = getTypeByValue(value);
        const config = AI_CONTEXT_NODE_CONFIGS.find(
          (config) => config.type === type,
        );
        if (config) {
          const contextValue = config.displayTextToValue(value);
          switch (type) {
            case ContextType.FILE: {
              const fileItem = getFileByValue(value);
              if (fileItem) {
                context.actions.addSelectContext(
                  {
                    type,
                    value: contextValue,
                    displayText: value,
                  },
                  fileItem,
                );
              }
              break;
            }
            // extend other type here
            default:
            // do nothing
          }
        }
        inputRef.current?.blur();
      }}
    >
      {({ onKeyDown, onTrigger }) =>
        inputVisible ? (
          <Input
            className={styles.input}
            ref={inputRef}
            style={{
              ...tagSize,
            }}
            onChange={(e) => setinputValue(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => onTrigger()}
            onBlur={() => {
              setInputVisible(false);
              setinputValue('');
              onTrigger(false);
            }}
          />
        ) : (
          <Tag
            ref={tagRef}
            className={styles.tag}
            icon={<PlusOutlined />}
            onClick={() => setInputVisible(true)}
          >
            {selectContexts.length === 0 && <span>Add Context</span>}
          </Tag>
        )
      }
    </Suggestion>
  );
};

export default AddContext;
