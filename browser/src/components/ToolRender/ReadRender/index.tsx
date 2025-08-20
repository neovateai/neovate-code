import { EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ToolMessage } from '@/types/message';
import type { IReadToolResult } from '@/types/tool';
import { ToolStatus } from '../components/ToolStatus';

export default function ReadRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;
  const { args, result, state } = message;
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 flex-nowrap">
      <EyeOutlined />
      <div className="overflow-hidden whitespace-nowrap text-ellipsis">
        {t('toolRenders.read.read')} {args?.file_path as string}
      </div>
      <div className="flex-1 text-right whitespace-nowrap text-ellipsis">
        {(result?.data as IReadToolResult)?.totalLines}{' '}
        {t('toolRenders.read.lines')}
      </div>
      <ToolStatus state={state} />
    </div>
  );
}
