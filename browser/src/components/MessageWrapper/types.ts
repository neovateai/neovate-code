export interface MessageWrapperProps {
  // === 基础配置 ===
  children: React.ReactNode;
  className?: string;

  // === 顶部内容配置 ===
  title?: React.ReactNode;
  icon?: React.ReactNode;

  // === 状态配置 ===
  status?: MessageWrapperStatus;
  statusConfig?: {
    icon?: React.ReactNode;
    text?: string;
    className?: string;
  };

  // === 展开/收起配置 ===
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  showExpandIcon?: boolean;
  expandable?: boolean;
  maxHeight?: number | string;
  showGradientMask?: boolean;

  // === 右上角操作按钮 ===
  actions?: ActionButtonProps[];
  onActionClick?: (actionKey: string) => void;
}

export interface ActionButtonProps {
  key: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

export enum MessageWrapperStatus {
  Thinking = 'thinking',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Error = 'error',
}
