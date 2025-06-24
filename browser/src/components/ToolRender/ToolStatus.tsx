import {
  CheckCircleFilled,
  CloseCircleFilled,
  LoadingOutlined,
} from '@ant-design/icons';
import type { ToolMessage } from '@/types/message';

interface ToolStatusProps {
  state: ToolMessage['state'];
}

export function ToolStatus({ state }: ToolStatusProps) {
  if (state === 'call') {
    return <LoadingOutlined spin style={{ color: '#1890ff' }} />;
  }
  if (state === 'result') {
    return <CheckCircleFilled style={{ color: '#52c41a' }} />;
  }
  return <CloseCircleFilled style={{ color: '#ff4d4f' }} />;
}
