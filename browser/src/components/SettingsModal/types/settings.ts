export type SettingsTab =
  | 'general'
  | 'commands'
  | 'agents'
  | 'memory'
  | 'plugins'
  | 'provider'
  | 'experimental'
  | 'changelog'
  | 'docs';

export interface SettingsTabItem {
  key: SettingsTab;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  link?: string;
}
