import { CheckOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useCallback, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { getEffectiveSettings, setSetting } from '@/api/settings';
import { actions, state } from '@/state/settings';
import SenderComponent from '../SenderComponent';

const ModelSelect = () => {
  const { settings } = useSnapshot(state);

  // Lazy load settings on first render if not already loaded
  useEffect(() => {
    if (!settings.loaded && !settings.loading) {
      actions.loadSettings();
    }
  }, [settings.loaded, settings.loading]);

  const currentModel = settings.effectiveSettings.model || 'flash';

  // Optimize with useCallback to prevent unnecessary re-renders
  const handleModelChange = useCallback(
    async (value: string) => {
      try {
        // Save setting directly via API
        await setSetting(settings.currentScope, 'model', value);

        // Update local state
        actions.updateSettingValue('model', value);

        // Reload effective settings
        const effectiveResponse = await getEffectiveSettings();
        if (effectiveResponse.data) {
          state.settings.effectiveSettings = effectiveResponse.data;
        }
      } catch (error) {
        console.error('Failed to update model:', error);
      }
    },
    [settings.currentScope],
  );

  return (
    <SenderComponent.Select
      value={currentModel}
      onChange={(value) => {
        handleModelChange(value as string);
      }}
      popupMatchSelectWidth={false}
      dropdownStyle={{ maxWidth: '220px' }}
      options={settings.availableModels.map((model) => {
        return {
          label: model.value,
          value: model.key,
          modelItem: model,
        };
      })}
      optionRender={(option) => {
        const { data, value } = option;
        const { modelItem } = data;
        return (
          <div className="flex justify-between items-center gap-4 p-1 w-full">
            <Tooltip title={modelItem.value} placement="right">
              <div className="text-sm text-[#110C22] font-normal truncate flex-1 max-w-[180px]">
                {modelItem.value}
              </div>
            </Tooltip>
            {currentModel === value && (
              <CheckOutlined className="text-[#7357FF]! text-base flex-shrink-0" />
            )}
          </div>
        );
      }}
    />
  );
};

export default ModelSelect;
