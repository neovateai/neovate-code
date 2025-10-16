import { useRequest } from 'ahooks';
import { Divider, Input, Select, Typography } from 'antd';
import { createStyles } from 'antd-style';
import classNames from 'classnames';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { state as chatState } from '@/state/chat';
import { actions, state } from '@/state/config';
import type { Config } from '@/types/config';
import SettingItem from './SettingItem';

const { Title, Paragraph } = Typography;

const useStyles = createStyles(({ css }) => ({
  general: css`

  `,
  w2: css`
    width: 216px;
  `,
}));

const GeneralSettings: React.FC = () => {
  const { t } = useTranslation();
  const { productName } = useSnapshot(chatState);
  const { styles } = useStyles();
  const { config } = useSnapshot(state);
  const { loading, data } = useRequest(() => actions.getModelsList());

  const modelsList = useMemo(() => {
    if (data?.success) {
      return data.data.groupedModels;
    }
    return [];
  }, [data]);

  const generalCls = classNames('flex-1 p-6 overflow-y-auto', styles.general);

  const handleFieldChange = (field: keyof Config, value: any) => {
    console.log(field, value);
  };

  return (
    <div className={generalCls}>
      <Title level={2} className="!mb-2">
        {t('settings.general.title')}
      </Title>
      <Paragraph className="text-gray-600 dark:text-gray-400 !mb-8">
        {t('settings.general.description', { productName })}
      </Paragraph>
      <Divider />

      {/* 默认模型 */}
      <SettingItem
        label={t('settings.general.defaultModel')}
        description={t('settings.general.defaultModelDesc')}
        content={
          <Select
            loading={loading}
            onChange={(value) => handleFieldChange('model', value)}
            value={config?.model}
            className="w-60"
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
                    label={model.name}
                  >
                    {model.name}
                  </Select.Option>
                ))}
              </Select.OptGroup>
            ))}
          </Select>
        }
      />
      <Divider />
      <SettingItem
        label={t('settings.general.language')}
        description={t('settings.general.languageDesc')}
        content={
          <Input
            className={styles.w2}
            value={config?.language}
            onChange={(e) => handleFieldChange('language', e.target.value)}
          />
        }
      />
      <Divider />
    </div>
  );
};

export default GeneralSettings;
