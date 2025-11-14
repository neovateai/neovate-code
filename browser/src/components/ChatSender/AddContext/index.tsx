import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import SuggestionList from '@/components/SuggestionList';
import { ContextType } from '@/constants/context';
import { useSuggestion } from '@/hooks/useSuggestion';
import * as context from '@/state/context';
import SenderComponent from '../SenderComponent';

const AddContext = () => {
  const { attachedContexts } = useSnapshot(context.state);
  const [openPopup, setOpenPopup] = useState(false);

  const { t } = useTranslation();

  const {
    defaultSuggestions,
    handleSearch,
    loading: suggestionLoading,
  } = useSuggestion(false);

  return (
    <SuggestionList
      open={openPopup}
      onOpenChange={(open) => setOpenPopup(open)}
      items={defaultSuggestions}
      loading={suggestionLoading}
      onSearch={(type, text) => {
        handleSearch(type as ContextType, text);
      }}
      onSelect={(_type, _itemValue, contextItem) => {
        setOpenPopup(false);
        if (contextItem) {
          context.actions.addContext(contextItem);
        }
      }}
    >
      <SenderComponent.Button onClick={() => setOpenPopup(true)}>
        <div>@</div>
        {attachedContexts.length === 0 && <div>{t('context.addContext')}</div>}
      </SenderComponent.Button>
    </SuggestionList>
  );
};

export default AddContext;
