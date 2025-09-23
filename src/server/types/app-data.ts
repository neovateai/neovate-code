import type { Config } from '../../config';

export interface ModuleIframeView {
  type: 'iframe';
  src: string;
}

export type ModuleView = ModuleIframeView;

export interface CustomTab {
  name: string;
  title: string;
  icon: string;
  view: ModuleView;
}

export interface ContextMenuItem {
  label: string;
  value: string;
  icon?: string;
  children?: ContextMenuItem[];
  extra?: string;
}

export interface UISchema {
  logo?: string;
  customTabs?: CustomTab[];
  contextMenu?: ContextMenuItem[];
}

export interface ServerAppData {
  productName: string;
  version: string;
  cwd: string;
  config: Config;
  ui: UISchema;
}
