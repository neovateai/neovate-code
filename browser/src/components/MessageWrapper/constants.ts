import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  Loading3QuartersOutlined,
} from '@ant-design/icons';
import React from 'react';
import { MessageWrapperStatus } from './types';

export interface StatusConfig {
  icon: React.ReactNode;
  text:
    | 'messageWrapper.status.thinking'
    | 'messageWrapper.status.completed'
    | 'messageWrapper.status.cancelled'
    | 'messageWrapper.status.error';
  className: string;
}

// Status configuration - Based on Figma design
// Note: Text values will be replaced by i18n keys in component usage
export const STATUS_CONFIG: Record<MessageWrapperStatus, StatusConfig> = {
  [MessageWrapperStatus.Thinking]: {
    icon: React.createElement(Loading3QuartersOutlined, {
      className: 'w-3.5 h-3.5 animate-spin',
      style: { color: '#7357FF' },
    }),
    text: 'messageWrapper.status.thinking',
    className: 'text-[#666F8D]',
  },
  [MessageWrapperStatus.Completed]: {
    icon: React.createElement(CheckCircleOutlined, {
      className: 'w-3.5 h-3.5',
    }),
    text: 'messageWrapper.status.completed',
    className: 'text-[#666F8D]',
  },
  [MessageWrapperStatus.Cancelled]: {
    icon: React.createElement(CloseCircleOutlined, {
      className: 'w-3.5 h-3.5',
    }),
    text: 'messageWrapper.status.cancelled',
    className: 'text-[#666F8D]',
  },
  [MessageWrapperStatus.Error]: {
    icon: React.createElement(ExclamationCircleOutlined, {
      className: 'w-3.5 h-3.5',
    }),
    text: 'messageWrapper.status.error',
    className: 'text-[#666F8D]',
  },
};

// Icon styles
export const ICON_STYLES = {
  base: 'flex items-center justify-center',
  size: 'w-5 h-5',
} as const;

// Default style constants - Based on Figma design
export const DEFAULT_STYLES = {
  container: 'bg-white rounded-lg border border-[#EBEBEB]',
  header:
    'bg-[#F9FBFE] rounded-t-lg flex items-center gap-1.5 px-4 py-2 cursor-pointer h-9 min-h-[36px]',
  headerLeft: 'flex items-center gap-1.5',
  headerRight: 'flex items-center gap-1 ml-auto',
  arrow: 'transition-transform text-[#666F8D] w-3.5 h-3.5',
  arrowExpanded: 'rotate-180',
  icon: 'text-[#666F8D] w-3.5 h-3.5',
  title:
    'font-normal text-[#666F8D] text-xs leading-none max-w-[325px] truncate',
  status: 'flex items-center gap-1',
  statusText: 'text-xs font-medium text-[#666F8D] leading-none',
  statusIcon: 'w-3.5 h-3.5 flex items-center justify-center flex-shrink-0',
  statusIconInner: 'w-3.5 h-3.5 flex items-center justify-center',
  statusContainer: 'flex items-center gap-1 h-3.5',
  actionButton:
    'p-1 rounded transition-colors text-[#666F8D] [&_svg]:w-3.5 [&_svg]:h-3.5',
  content: 'overflow-hidden transition-all duration-300 ease-in-out',
  contentExpanded: 'opacity-100',
  contentCollapsed: 'opacity-0',
  contentInner: 'px-4 pb-4 pt-3',
  scrollable: 'overflow-y-auto',
} as const;
