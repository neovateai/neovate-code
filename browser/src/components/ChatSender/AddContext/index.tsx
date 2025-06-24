import Icon from '@ant-design/icons';
import { Tag } from 'antd';
import { createStyles } from 'antd-style';
import { useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import Suggestion from '@/components/Suggestion';
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
  const tagRef = useRef<HTMLDivElement>(null);
  const { contextItems, contextsSelectedValues } = useSnapshot(context.state);
  const [searchText, setSearchText] = useState('');
  const [keepMenuOpen, setKeepMenuOpen] = useState(false);

  const {
    suggestions,
    showSearch,
    handleValue,
    currentContextType,
    setCurrentContextType,
  } = useSuggestion(searchText, contextsSelectedValues);

  const { styles } = useStyle();

  return (
    <Suggestion
      showSearch={
        showSearch && {
          placeholder: 'Please input to search...',
          onSearch: (text) => {
            setSearchText(text);
          },
        }
      }
      items={suggestions}
      showBackButton={currentContextType !== ContextType.UNKNOWN}
      onBack={() => {
        setSearchText('');
        setCurrentContextType(ContextType.UNKNOWN);
      }}
      onBlur={() => {
        setKeepMenuOpen(false);
      }}
      outsideOpen={keepMenuOpen}
      onSelect={(value) => {
        setKeepMenuOpen(true);
        const contextItem = handleValue(value);
        if (contextItem) {
          setKeepMenuOpen(false);
          context.actions.addContext(contextItem);
        }
      }}
    >
      {({ onKeyDown, onTrigger }) => (
        <Tag
          ref={tagRef}
          className={styles.tag}
          icon={<Icon className={styles.icon} component={() => <div>@</div>} />}
          onKeyDown={onKeyDown}
          onClick={() => {
            onTrigger();
          }}
        >
          {contextItems.length === 0 && <span>Add Context</span>}
        </Tag>
      )}
    </Suggestion>
  );
};

export default AddContext;
