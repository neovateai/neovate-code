import type { UIToolPart } from '@/types/chat';
import DebugInfo from './DebugInfo';

interface ToolRenderProps {
  part?: UIToolPart;
}

export function withDebugInfo<P extends ToolRenderProps>(
  WrappedComponent: React.ComponentType<P>,
) {
  const ComponentWithDebugInfo = (props: P) => {
    return (
      <div>
        <WrappedComponent {...props} />
        <DebugInfo part={props.part} />
      </div>
    );
  };
  return ComponentWithDebugInfo;
}
