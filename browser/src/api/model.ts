export interface ImageItem {
  /** URL or base64 string */
  src: string;
  mime: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}
