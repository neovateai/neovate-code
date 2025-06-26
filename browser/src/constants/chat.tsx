import { ApiOutlined, MessageOutlined } from '@ant-design/icons';
import type { TFunction } from 'i18next';
import { keyBy } from 'lodash-es';

export const getModes = (t: TFunction) => [
  {
    icon: <ApiOutlined />,
    key: 'agent',
    label: t('senderFooterBoard.agentMode.label'),
    description: t('senderFooterBoard.agentMode.description'),
  },
  {
    icon: <MessageOutlined />,
    key: 'ask',
    label: t('senderFooterBoard.askMode.label'),
    description: t('senderFooterBoard.askMode.description'),
  },
];

export const getModesMap = (t: TFunction) => keyBy(getModes(t), 'key');
