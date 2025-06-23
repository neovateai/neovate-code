import { Config } from '../../config';

export interface CustomTab {
  // unique identifier
  name: 'knowledge';
  // title to display in the tab
  title: 'Knowledge';
  // any icon from Iconify, or a URL to an image
  icon: 'carbon:book';
  // iframe view
  view: {
    type: 'iframe';
    src: '/knowledge';
  };
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

export interface BrowserAppData {
  productName: string;
  version: string;
  cwd: string;
  config: Config;
  ui: UISchema;
}
