import {
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  Loading3QuartersOutlined,
} from '@ant-design/icons';
import React from 'react';
import Completed from '@/icons/completed.svg?react';
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
    icon: <Completed />,
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
