import type { UploadFile } from 'antd';
import type React from 'react';
import { z } from 'zod';
import type { FileItem, ImageItem } from '@/api/model';
import type { ContextType } from '@/constants/context';

type AttachmentItem = UploadFile;

export type ContextStoreValue = FileItem | ImageItem | AttachmentItem;

export interface ContextItem {
  type: ContextType;
  value: string;
  displayText: string;
  context?: ContextStoreValue;
  [key: string]: any;
}

export interface ContextFileType {
  extName: string;
  mime: string;
}

/**
 * Context instance configuration
 */
export interface IContextInstanceConfig<S extends z.Schema> {
  /**
   * Context item label, displayed on the second-level panel
   *
   * Dynamic scenario: Display different labels based on file type
   */
  label: React.ReactNode;

  /**
   * Context item value, required for second-level panel and selected context list
   *
   * Dynamic scenario: File path as list key
   */
  value: string;

  /**
   * Context item icon, displayed on the second-level panel
   *
   * Dynamic scenario: Display different icons based on file type
   *
   * If not provided, use IContextConfig.icon
   */
  subIcon?: React.ReactNode;

  /**
   * Context item extra information, displayed on the second-level panel
   *
   * If not provided, will not be displayed
   */
  extra?: React.ReactNode;

  /**
   * Disable context item on the second-level panel
   *
   * Dynamic scenario: Prevent selected contexts from being selected again
   */
  disabled?: boolean;

  /**
   * Click event for selected context tags
   *
   * Dynamic scenario: Trigger different content display based on file path
   */
  onSelectedItemClick?: (context: z.infer<S>) => void;
}

/**
 * Context type configuration
 */
export interface IContextConfig<S extends z.Schema> {
  /**
   * Unique key for context type
   *
   * Will be extended to the ContextType enum in AppData, used to determine context type
   *
   * @example '__file'
   */
  type: string;

  /**
   * Context type name, displayed on the first-level panel and used as search box placeholder
   *
   * Needs to support i18n
   *
   * @example 'Files'
   */
  name: string | (() => string);

  /**
   * Context type icon, displayed on the first-level panel
   */
  icon: React.ReactNode;

  /**
   * Context item schema
   *
   * Used to represent the structure of context instance object storeValue
   */
  itemSchema: S;

  /**
   * Context instance configuration
   *
   * Affects second-level panel appearance and selected Tag appearance
   *
   * Supports dynamic configuration
   */
  instanceConfig:
    | IContextInstanceConfig<S>
    | ((
        context: z.infer<S>,
        selectedContexts: z.infer<S>[],
      ) => IContextInstanceConfig<S>);

  /**
   * Method to fetch second-level list, supports search
   *
   * Will be mapped to list required configuration according to panelConfig
   *
   * Called after debounce processing
   */
  fetchList: (keyword?: string) => Promise<z.infer<S>[]>;
}

/**
 * Extract all type values from context configuration array to form union type
 */
type ExtractContextTypes<T extends readonly IContextConfig<any>[]> =
  T[number]['type'];

/**
 * Dynamically generate ContextType object based on context configuration
 */
export type DynamicContextType<T extends readonly IContextConfig<any>[]> = {
  readonly [K in ExtractContextTypes<T> as Uppercase<string & K>]: K;
};

export interface IGlobalContextConfig<
  T extends readonly IContextConfig<z.AnyZodObject>[],
> {
  /**
   * Global context configuration
   */
  contextConfigs: T;

  /**
   * Global context type
   */
  ContextType: DynamicContextType<T>;

  /**
   * Method to fetch global context list, supports search
   *
   * Called after debounce processing
   */
  fetchGlobalList: (keyword?: string) => Promise<
    {
      type: DynamicContextType<T>[keyof DynamicContextType<T>];
      context: z.AnyZodObject;
    }[]
  >;
}
