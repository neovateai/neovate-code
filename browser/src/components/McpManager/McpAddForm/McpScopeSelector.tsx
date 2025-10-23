import { QuestionCircleOutlined } from '@ant-design/icons';
import { Radio, Tooltip, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './index.module.css';

const { Text } = Typography;

interface McpScopeSelectorProps {
  value: 'global' | 'project';
  onChange: (scope: 'global' | 'project') => void;
}

/**
 * Scope selector component for choosing between global and project scope
 */
export const McpScopeSelector: React.FC<McpScopeSelectorProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.settingGroup}>
      <div className={styles.settingHeader}>
        <Text className={styles.settingLabel}>{t('mcp.scope')}</Text>
        <Tooltip title={t('mcp.scopeTooltip')}>
          <QuestionCircleOutlined className={styles.questionIcon} />
        </Tooltip>
      </div>
      <Radio.Group
        value={value}
        onChange={(e) => onChange(e.target.value as 'global' | 'project')}
        className={styles.radioGroup}
      >
        <Radio value="project" className={styles.radioOption}>
          {t('mcp.project')}
        </Radio>
        <Radio value="global" className={styles.radioOption}>
          {t('mcp.global')}
        </Radio>
      </Radio.Group>
    </div>
  );
};
