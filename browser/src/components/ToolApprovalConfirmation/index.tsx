import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { Button, Flex, Space, Tag, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { toolApprovalActions, toolApprovalState } from '@/state/toolApproval';
import type { ToolApprovalRequestMessage } from '@/types/message';

const { Text } = Typography;

const useStyle = createStyles(({ token, css }) => {
  return {
    container: css`
      padding: ${token.paddingMD}px 0;
      border-left: 3px solid ${token.colorWarning};
      padding-left: ${token.paddingMD}px;
      background: ${token.colorWarningBg};
      border-radius: 0 ${token.borderRadiusLG}px ${token.borderRadiusLG}px 0;
      margin: ${token.marginXS}px 0;
    `,
    title: css`
      color: ${token.colorWarningText};
      font-weight: 500;
      margin-bottom: ${token.marginXS}px;
    `,
    description: css`
      color: ${token.colorTextSecondary};
      margin-bottom: ${token.marginMD}px;
    `,
    toolInfo: css`
      background: ${token.colorBgContainer};
      border-radius: ${token.borderRadius}px;
      padding: ${token.paddingSM}px;
      margin-bottom: ${token.marginMD}px;
    `,
    params: css`
      background: ${token.colorFillQuaternary};
      border-radius: ${token.borderRadius}px;
      padding: ${token.paddingSM}px;
      margin-top: ${token.marginXS}px;
      font-family: ${token.fontFamilyCode};
      font-size: ${token.fontSizeSM}px;
      max-height: 120px;
      overflow-y: auto;
    `,
    errorAlert: css`
      background: ${token.colorErrorBg};
      border: 1px solid ${token.colorErrorBorder};
      border-radius: ${token.borderRadius}px;
      padding: ${token.paddingSM}px;
      margin-bottom: ${token.marginMD}px;
    `,
    loadingIndicator: css`
      color: ${token.colorPrimary};
      font-size: ${token.fontSizeSM}px;
    `,
    buttonGroup: css`
      gap: ${token.marginXS}px;
      flex-wrap: wrap;
    `,
  };
});

interface ToolApprovalConfirmationProps {
  message: ToolApprovalRequestMessage;
}

export default function ToolApprovalConfirmation({
  message,
}: ToolApprovalConfirmationProps) {
  const { t } = useTranslation();
  const { styles } = useStyle();
  const snap = useSnapshot(toolApprovalState);
  const [showParams, setShowParams] = useState(false);

  // 检查当前消息是否为当前待处理的请求
  if (
    !snap.currentRequest ||
    snap.currentRequest.toolCallId !== message.toolCallId
  ) {
    return null;
  }

  // 格式化工具参数描述
  const getToolDescription = (
    toolName: string,
    params: Record<string, any>,
  ) => {
    switch (toolName) {
      case 'read':
        return t('toolApproval.toolDescriptions.read', {
          filePath: params.file_path,
        });
      case 'bash':
        return t('toolApproval.toolDescriptions.bash', {
          command: params.command,
        });
      case 'edit':
        return t('toolApproval.toolDescriptions.edit', {
          filePath: params.file_path,
        });
      case 'write':
        return t('toolApproval.toolDescriptions.write', {
          filePath: params.file_path,
        });
      case 'fetch':
        return t('toolApproval.toolDescriptions.fetch', { url: params.url });
      case 'glob':
        return t('toolApproval.toolDescriptions.glob', {
          pattern: params.pattern,
        });
      case 'grep':
        return t('toolApproval.toolDescriptions.grep', {
          pattern: params.pattern,
        });
      case 'ls':
        return t('toolApproval.toolDescriptions.ls', {
          dirPath: params.dir_path,
        });
      default:
        return t('toolApproval.toolDescriptions.default', { toolName });
    }
  };

  const onApprove = (option: 'once' | 'always' | 'always_tool') => {
    toolApprovalActions.approveToolUse(true, option);
  };

  const onDeny = () => {
    toolApprovalActions.approveToolUse(false);
  };

  const onRetry = () => {
    toolApprovalActions.retrySubmit();
  };

  const description = getToolDescription(message.toolName, message.args);
  const isSubmitting = snap.submitting;
  const hasError = !!snap.submitError;

  return (
    <div className={styles.container}>
      {/* 标题 */}
      <Text className={styles.title}>
        🔐 {t('toolApproval.title', '工具执行权限确认')}
      </Text>

      {/* 描述 */}
      <Text className={styles.description}>
        {t('toolApproval.description', 'AI 请求执行以下工具，是否允许？')}
      </Text>

      {/* 工具信息 */}
      <div className={styles.toolInfo}>
        <Flex justify="space-between" align="center">
          <Flex align="center" gap="small">
            <Tag color="blue">{message.toolName}</Tag>
            <Text type="secondary">{description}</Text>
          </Flex>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setShowParams(!showParams)}
          >
            {showParams
              ? t('toolApproval.hideParameters')
              : t('toolApproval.showParameters')}
          </Button>
        </Flex>

        {showParams && (
          <pre className={styles.params}>
            {JSON.stringify(message.args, null, 2)}
          </pre>
        )}
      </div>

      {/* 错误提示 */}
      {hasError && (
        <div className={styles.errorAlert}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap="small">
              <CloseOutlined style={{ color: '#ff4d4f' }} />
              <div>
                <Text strong>{t('toolApproval.submitFailed')}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {snap.submitError}
                </Text>
              </div>
            </Flex>
            <Button size="small" onClick={onRetry} disabled={isSubmitting}>
              {t('toolApproval.retry')}
            </Button>
          </Flex>
        </div>
      )}

      {/* 提交中提示 */}
      {isSubmitting && (
        <Text className={styles.loadingIndicator}>
          ⏳ {t('toolApproval.submitting')}
        </Text>
      )}

      {/* 操作按钮 */}
      <Flex className={styles.buttonGroup}>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          onClick={() => onApprove('once')}
          disabled={isSubmitting}
          size="small"
        >
          {t('toolApproval.approveOnce', '允许一次')}
        </Button>

        <Button
          onClick={() => onApprove('always')}
          disabled={isSubmitting}
          size="small"
        >
          {t('toolApproval.approveAlways', '允许此命令')}
        </Button>

        <Button
          onClick={() => onApprove('always_tool')}
          disabled={isSubmitting}
          size="small"
        >
          {t('toolApproval.approveAlwaysTool', `允许 ${message.toolName}`, {
            toolName: message.toolName,
          })}
        </Button>

        <Button danger onClick={onDeny} disabled={isSubmitting} size="small">
          {t('toolApproval.deny', '拒绝')}
        </Button>
      </Flex>
    </div>
  );
}
