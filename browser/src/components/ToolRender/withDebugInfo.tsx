import type { ToolMessage } from '@/types/message';
import DebugInfo from './DebugInfo';

interface ToolRenderProps {
  message?: ToolMessage;
}

export function withDebugInfo<P extends ToolRenderProps>(
  WrappedComponent: React.ComponentType<P>,
) {
  const ComponentWithDebugInfo = (props: P) => {
    return (
      <div>
        <WrappedComponent {...props} />
        <DebugInfo message={props.message} />
      </div>
    );
  };
  return ComponentWithDebugInfo;
}
