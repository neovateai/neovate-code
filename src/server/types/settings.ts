export interface SetSettingRequest {
  scope?: string;
  key?: string;
  value?: string | boolean | string[] | number;
}

export interface BatchUpdateRequest {
  scope?: string;
  settings?: Record<string, string | boolean | string[] | number>;
}
