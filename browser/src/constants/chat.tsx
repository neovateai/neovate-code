import { MessageOutlined } from '@ant-design/icons';
import { keyBy } from 'lodash-es';
import i18n from '@/i18n';
import AgentIcon from '@/icons/agent.svg?react';

export const MODES = [
  {
    icon: <AgentIcon />,
    key: 'agent',
    get label() {
      return i18n.t('modes.agent');
    },
    get description() {
      return i18n.t('modes.agentDescription');
    },
  },
  {
    icon: <MessageOutlined />,
    key: 'ask',
    get label() {
      return i18n.t('modes.ask');
    },
    get description() {
      return i18n.t('modes.askDescription');
    },
  },
];

export const MODES_MAP = keyBy(MODES, 'key');
