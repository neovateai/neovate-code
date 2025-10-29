import { useRequest } from 'ahooks';
import { Select } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/config';
import { state as chatState } from '@/state/chat';
import SenderComponent from '../SenderComponent';

const ModelSelect = () => {
  const { t } = useTranslation();
  const { config } = useSnapshot(state);
  const { cwd, initialized } = useSnapshot(chatState);

  const { loading, data } = useRequest(
    () => {
      return actions.getModelsList();
    },
    {
      ready: !!cwd && initialized, // Only call API when cwd exists and is initialized
      refreshDeps: [cwd, initialized],
    },
  );

  const modelsList = useMemo(() => {
    if (data?.success) {
      return data.data.groupedModels;
    }
    return [];
  }, [data]);

  return (
    <SenderComponent.Select
      value={config?.model}
      onChange={(value) => {
        actions.set('model', value);
      }}
      loading={loading}
      popupMatchSelectWidth={false}
      placeholder={t('chat.selectModel', '选择模型')}
      className="min-w-[140px]"
      optionLabelProp="label"
    >
      {modelsList.map((providerGroup) => (
        <Select.OptGroup
          key={providerGroup.providerId}
          label={providerGroup.provider}
        >
          {providerGroup.models.map((model) => (
            <Select.Option
              key={model.value}
              value={model.value}
              label={
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                    {providerGroup.provider}
                  </span>
                  {model.name}
                </div>
              }
            >
              {model.name}
            </Select.Option>
          ))}
        </Select.OptGroup>
      ))}
    </SenderComponent.Select>
  );
};

export default ModelSelect;
