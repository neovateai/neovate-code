import en from "../i18n/locales/en.json";

declare module '*.json' {
  const content: Record<string, any>;
  export default content;
}

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}
