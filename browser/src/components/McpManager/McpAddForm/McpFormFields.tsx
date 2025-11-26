import { Form, Input, Select, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MCP_DEFAULTS } from '@/constants/mcp';
import { modalEventHandlers } from '@/utils/eventUtils';
import styles from './index.module.css';
import { McpJsonEditor } from './McpJsonEditor';

const { Text } = Typography;

/**
 * Form fields component for edit mode (single server configuration)
 */
export const McpFormFields: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.formFieldsContainer}>
      {/* First row: Server name and transport type */}
      <div className={styles.formFieldsRow}>
        <div className={styles.formField}>
          <div className={styles.fieldLabel}>
            <Text className={styles.settingLabel}>{t('mcp.serverName')}</Text>
            <span className={styles.requiredMark}>*</span>
          </div>
          <Form.Item
            name="name"
            rules={[
              {
                required: true,
                message: t('mcp.configurationPlaceholder'),
              },
            ]}
          >
            <Input
              placeholder={t('mcp.serverNamePlaceholder')}
              className={styles.formInput}
              {...modalEventHandlers}
            />
          </Form.Item>
        </div>
        <div className={styles.formField}>
          <div className={styles.fieldLabel}>
            <Text className={styles.settingLabel}>
              {t('mcp.transportType')}
            </Text>
          </div>
          <Form.Item name="type" initialValue={MCP_DEFAULTS.TRANSPORT_TYPE}>
            <Select>
              <Select.Option value="stdio">STDIO</Select.Option>
              <Select.Option value="sse">SSE</Select.Option>
              <Select.Option value="http">HTTP</Select.Option>
            </Select>
          </Form.Item>
        </div>
      </div>

      {/* Second row: Command and arguments */}
      <div className={styles.formFieldsRow}>
        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) => prev.type !== curr.type}
        >
          {({ getFieldValue }) => {
            return getFieldValue('type') === 'sse' ||
              getFieldValue('type') === 'http' ? (
              <div className={styles.formField}>
                <div className={styles.fieldLabel}>
                  <Text className={styles.settingLabel}>{t('mcp.url')}</Text>
                  <span className={styles.requiredMark}>*</span>
                </div>
                <Form.Item
                  name="url"
                  rules={[
                    {
                      required: true,
                      message: t('mcp.configurationPlaceholder'),
                    },
                  ]}
                >
                  <Input
                    placeholder={t('mcp.urlPlaceholder')}
                    className={styles.formInput}
                    {...modalEventHandlers}
                  />
                </Form.Item>
              </div>
            ) : (
              <>
                <div className={styles.formField}>
                  <div className={styles.fieldLabel}>
                    <Text className={styles.settingLabel}>
                      {t('mcp.command')}
                    </Text>
                    <span className={styles.requiredMark}>*</span>
                  </div>
                  <Form.Item
                    name="command"
                    rules={[
                      {
                        required: true,
                        message: t('mcp.configurationPlaceholder'),
                      },
                    ]}
                  >
                    <Input
                      placeholder={t('mcp.commandPlaceholder')}
                      className={styles.formInput}
                      {...modalEventHandlers}
                    />
                  </Form.Item>
                </div>
                <div className={styles.formField}>
                  <div className={styles.fieldLabel}>
                    <Text className={styles.settingLabel}>
                      {t('mcp.arguments')}
                    </Text>
                  </div>
                  <Form.Item name="args">
                    <Input
                      placeholder={t('mcp.argumentsPlaceholder')}
                      className={styles.formInput}
                      {...modalEventHandlers}
                    />
                  </Form.Item>
                </div>
              </>
            );
          }}
        </Form.Item>
      </div>

      {/* Third row: Environment variables */}
      <div className={styles.formFieldsRow}>
        <div className={styles.formFieldFull}>
          <div className={styles.fieldLabel}>
            <Text className={styles.settingLabel}>
              {t('mcp.environmentVariables')}
            </Text>
          </div>
          <Form.Item name="env">
            <McpJsonEditor height="120px" />
          </Form.Item>
        </div>
      </div>
    </div>
  );
};
