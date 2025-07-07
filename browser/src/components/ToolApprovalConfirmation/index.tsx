import {
  CheckOutlined,
  CloseOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { Button, Checkbox, Flex, Select, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { toolApprovalActions, toolApprovalState } from '@/state/toolApproval';
import type { ToolApprovalRequestMessage } from '@/types/message';

const { Text } = Typography;

interface ToolApprovalConfirmationProps {
  message: ToolApprovalRequestMessage;
}

export default function ToolApprovalConfirmation({
  message,
}: ToolApprovalConfirmationProps) {
  const { t } = useTranslation();
  const snap = useSnapshot(toolApprovalState);
  const [autoApprove, setAutoApprove] = useState(false);
  const [autoApproveMode, setAutoApproveMode] = useState<
    'always' | 'always_tool'
  >('always_tool');

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

  const onApprove = () => {
    toolApprovalActions.approveToolUse(
      true,
      autoApprove ? autoApproveMode : 'once',
    );
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
    <div className="mx-0 my-1 rounded-lg border border-gray-200 bg-white p-2.5">
      <Flex vertical gap="middle">
        <div className="flex items-center gap-2">
          <GlobalOutlined />
          <Text
            className="truncate"
            title={description}
            style={{
              maxWidth: 'calc(100% - 30px)',
            }}
          >
            {description}
          </Text>
        </div>

        <div className="flex items-center justify-between">
          <Flex align="center" gap="small">
            <Checkbox
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              disabled={isSubmitting}
            >
              {t('toolApproval.autoApprove', 'Auto-approve')}
            </Checkbox>
            {autoApprove && (
              <Select
                value={autoApproveMode}
                onChange={setAutoApproveMode}
                disabled={isSubmitting}
                size="small"
                style={{ width: 140 }}
              >
                <Select.Option value="always_tool">
                  {t('toolApproval.autoApproveForTool', 'For this tool')}
                </Select.Option>
                <Select.Option value="always">
                  {t('toolApproval.autoApproveForAll', 'For all tools')}
                </Select.Option>
              </Select>
            )}
          </Flex>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={onDeny} disabled={isSubmitting} size="small">
              {t('toolApproval.cancel', 'Cancel')}
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={onApprove}
              disabled={isSubmitting}
              size="small"
            >
              {t('toolApproval.continue', 'Continue')}
            </Button>
          </div>
        </div>
      </Flex>

      {/* 错误提示 */}
      {hasError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3">
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
      {isSubmitting && !hasError && (
        <Text className="text-sm text-blue-500">
          ⏳ {t('toolApproval.submitting')}
        </Text>
      )}
    </div>
  );
}
