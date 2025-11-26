import { useRequest } from 'ahooks';
import { Input, Select } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { state as chatState } from '@/state/chat';
import { actions, state } from '@/state/config';
import SenderComponent from '../SenderComponent';

const ModelSelect = () => {
  const { t } = useTranslation();
  const { config } = useSnapshot(state);
  const { cwd, initialized } = useSnapshot(chatState);
  const [searchText, setSearchText] = useState('');

  const { loading, data } = useRequest(
    () => {
      return actions.getModelsList();
    },
    {
      ready: !!cwd && initialized, // Only call API when cwd exists and is initialized
      refreshDeps: [cwd, initialized],
      onSuccess: async () => {
        await actions.getConfig();
      },
    },
  );

  const modelsList = useMemo(() => {
    if (data?.success) {
      return data.data.groupedModels;
    }
    return [];
  }, [data]);

  const filteredModelsList = useMemo(() => {
    if (!searchText.trim()) {
      return modelsList;
    }

    return modelsList
      .map((providerGroup) => ({
        ...providerGroup,
        models: providerGroup.models.filter(
          (model) =>
            model.name.toLowerCase().includes(searchText.toLowerCase()) ||
            model.value.toLowerCase().includes(searchText.toLowerCase()),
        ),
      }))
      .filter((providerGroup) => providerGroup.models.length > 0);
  }, [modelsList, searchText]);

  const customDropdown = (menu: React.ReactElement) => (
    <div className="w-full min-w-[280px]">
      <div className="px-3 py-2 bg-white">
        <Input
          placeholder={t('chat.searchModel', 'Search models')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border-none shadow-none"
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            boxShadow: 'none',
            paddingLeft: 0,
            paddingRight: 0,
          }}
          autoFocus
        />
      </div>
      <div
        className="max-h-60 overflow-y-auto bg-white"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db transparent',
        }}
      >
        {filteredModelsList.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {t('chat.noModelsFound', 'No models found')}
          </div>
        ) : (
          menu
        )}
      </div>
    </div>
  );

  return (
    <SenderComponent.Select
      value={config?.model}
      onChange={(value) => {
        actions.set('model', value);
        setSearchText(''); // Clear search when selecting
      }}
      loading={loading}
      popupMatchSelectWidth={false}
      placeholder={t('chat.selectModel')}
      className="min-w-[140px]"
      optionLabelProp="label"
      showSearch={false} // Disable default search as we have custom search
      filterOption={false} // Disable default filtering
      dropdownRender={customDropdown}
      onDropdownVisibleChange={(open) => {
        if (!open) {
          setSearchText(''); // Clear search when closing dropdown
        }
      }}
    >
      {filteredModelsList.map((providerGroup) => (
        <Select.OptGroup
          key={providerGroup.providerId}
          label={
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-0 py-1">
              {providerGroup.provider}
            </div>
          }
        >
          {providerGroup.models.map((model) => (
            <Select.Option
              key={model.value}
              value={model.value}
              label={
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded ml-1">
                    {providerGroup.provider}
                  </span>
                  {model.name}
                </div>
              }
            >
              <div className="px-0 py-1">
                <span className="text-sm text-gray-900 font-medium">
                  {model.name}
                </span>
              </div>
            </Select.Option>
          ))}
        </Select.OptGroup>
      ))}
    </SenderComponent.Select>
  );
};

export default ModelSelect;
