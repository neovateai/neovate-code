import { CloseCircleOutlined, RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ToolMessage } from '@/types/message';

export default function FailRender({ message }: { message: ToolMessage }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="text-sm rounded-md overflow-hidden bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50 my-2">
      <div
        className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors duration-200"
        onClick={handleToggle}
      >
        <span
          className={`text-gray-500 transition-transform duration-300 ease-in-out ${
            isExpanded ? 'rotate-90' : ''
          }`}
        >
          <RightOutlined />
        </span>
        <span className="text-red-500">
          <CloseCircleOutlined />
        </span>
        <div>{t('tool.callFailed', { toolName: message.toolName })}</div>
      </div>

      <div
        className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
          isExpanded ? 'max-h-screen' : 'max-h-0'
        }`}
      >
        <div className="p-3 bg-gray-100 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-600/50">
          <div className="text-xs text-gray-500 mb-2">
            {t('tool.detailInfo')}:
          </div>
          <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded whitespace-pre-wrap break-all text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-64">
            {JSON.stringify(message, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
