export interface MessageWrapperProps {
  // === Basic Configuration ===
  children: React.ReactNode;
  className?: string;

  // === Header Content Configuration ===
  title?: React.ReactNode;
  icon?: React.ReactNode;

  // === Status Configuration ===
  status?: MessageWrapperStatus;
  statusIcon?: React.ReactNode;
  statusText?: string;
  statusClassName?: string;

  // === Expand/Collapse Configuration ===
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  showExpandIcon?: boolean;
  expandable?: boolean;
  maxHeight?: number | string;
  showGradientMask?: boolean;

  // === Top Right Action Buttons ===
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
