import Icon from '@ant-design/icons';
import { Tag } from 'antd';
import { createStyles } from 'antd-style';
import { useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import SuggestionList from '@/components/SuggestionList';
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
    icon: css`
      font-size: 14px;
      height: 22px;
      color: ${token.colorText} !important;
    `,
  };
});

const AddContext = () => {
  const tagRef = useRef<HTMLDivElement>(null);
  const { attachedContexts, contextsSelectedValues } = useSnapshot(
    context.state,
  );
  const [openPopup, setOpenPopup] = useState(false);

  const {
    defaultSuggestions,
    handleSearch,
    getOriginalContextByValue,
    loading: suggestionLoading,
  } = useSuggestion(contextsSelectedValues);

  const { styles } = useStyle();

  return (
    <SuggestionList
      open={openPopup}
      onOpenChange={(open) => setOpenPopup(open)}
      items={defaultSuggestions}
      loading={suggestionLoading}
      onSearch={(type, text) => {
        handleSearch(type as ContextType, text);
      }}
      onSelect={(type, itemValue) => {
        setOpenPopup(false);
        const contextItem = getOriginalContextByValue({
          type: type as ContextType,
          value: itemValue,
          remainAfterSend: true,
        });

        if (contextItem) {
          context.actions.addContext(contextItem);
        }
      }}
    >
      <Tag
        ref={tagRef}
        className={styles.tag}
        icon={<Icon className={styles.icon} component={() => <div>@</div>} />}
        onClick={() => setOpenPopup(true)}
      >
        {attachedContexts.length === 0 && <span>Add Context</span>}
      </Tag>
    </SuggestionList>
  );
};

export default AddContext;
