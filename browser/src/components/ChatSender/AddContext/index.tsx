import Icon from '@ant-design/icons';
import { Input, type InputRef, Tag } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import Suggestion from '@/components/Suggestion';
import { AI_CONTEXT_NODE_CONFIGS } from '@/constants/context';
import { ContextType } from '@/constants/context';
import { useSuggestion } from '@/hooks/useSuggestion';
import * as context from '@/state/context';

const useStyle = createStyles(({ css, token }) => {
  return {
    tag: css`
      user-select: none;
      cursor: pointer;
      border-style: dashed;
      background-color: inherit;
      line-height: inherit;
      margin-right: 0;

      display: flex;
      align-items: center;
    `,
    input: css`
      /* margin-right: 8px; */
    `,
    icon: css`
      font-size: 14px;
      height: 22px;
      color: ${token.colorText} !important;
    `,
  };
});

const AddContext = () => {
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setinputValue] = useState('');
  const inputRef = useRef<InputRef>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const { contextItems, contextsSelectedValues } = useSnapshot(context.state);
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
                context.actions.addContext({
                  type,
                  value: contextValue,
                  displayText: value,
                  context: fileItem,
                });
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
            icon={
              <Icon className={styles.icon} component={() => <div>@</div>} />
            }
            onClick={() => setInputVisible(true)}
          >
            {contextItems.length === 0 && <span>Add Context</span>}
          </Tag>
        )
      }
    </Suggestion>
  );
};

export default AddContext;
