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
 * 上下文实例配置
 */
export interface IContextInstanceConfig<S extends z.Schema> {
  /**
   * 上下文项目标签，会展示在二级面板上
   *
   * 动态场景：根据文件类型展示不同标签
   */
  label: React.ReactNode;

  /**
   * 上下文项目值，二级面板和已选择的上下文列表需要
   *
   * 动态场景：文件路径作为列表key
   */
  value: string;

  /**
   * 上下文项目图标，会展示在二级面板上
   *
   * 动态场景：根据文件类型展示不同图标
   *
   * 不填写则使用IContextConfig.icon
   */
  subIcon?: React.ReactNode;

  /**
   * 上下文项目额外信息，会展示在二级面板上
   *
   * 不填写则不展示
   */
  extra?: React.ReactNode;

  /**
   * 上下文项目在二级面板上禁用
   *
   * 动态场景：限制已选择的上下文不可重复选择
   */
  disabled?: boolean;

  /**
   * 已选中的上下文标签点击事件
   *
   * 动态场景：根据文件路径触发不同的内容展示
   */
  onSelectedItemClick?: (context: z.infer<S>) => void;
}

/**
 * 上下文类型配置
 */
export interface IContextConfig<S extends z.Schema> {
  /**
   * 上下文类型唯一Key
   *
   * 会扩展到AppData的ContextType枚举上，用于判断上下文类型
   *
   * @example '__file'
   */
  type: string;

  /**
   * 上下文类型名称，会展示在一级面板上，以及作为搜索框的placeholder
   *
   * 需要支持i18n
   *
   * @example '文件'
   */
  name: string | (() => string);

  /**
   * 上下文类型图标，会展示在一级面板上
   */
  icon: React.ReactNode;

  /**
   * 上下文项目schema
   *
   * 用于表示上下文实例对象storeValue的结构
   */
  itemSchema: S;

  /**
   * 上下文实例配置
   *
   * 影响二级面板表现和选中的Tag表现
   *
   * 支持动态配置
   */
  instanceConfig:
    | IContextInstanceConfig<S>
    | ((
        context: z.infer<S>,
        selectedContexts: z.infer<S>[],
      ) => IContextInstanceConfig<S>);

  /**
   * 拉取二级列表的方式，支持搜索
   *
   * 会根据panelConfig映射为列表需要的配置
   *
   * 调用时已经过debounce处理
   */
  fetchList: (keyword?: string) => Promise<z.infer<S>[]>;
}

/**
 * 从上下文配置数组中提取出所有的type值组成联合类型
 */
type ExtractContextTypes<T extends readonly IContextConfig<any>[]> =
  T[number]['type'];

/**
 * 根据上下文配置动态生成ContextType对象
 */
export type DynamicContextType<T extends readonly IContextConfig<any>[]> = {
  readonly [K in ExtractContextTypes<T> as Uppercase<string & K>]: K;
};

export interface IGlobalContextConfig<
  T extends readonly IContextConfig<z.AnyZodObject>[],
> {
  /**
   * 全局上下文配置
   */
  contextConfigs: T;

  /**
   * 全局上下文类型
   */
  ContextType: DynamicContextType<T>;

  /**
   * 拉取全局上下文列表的方式，支持搜索
   *
   * 调用时已经过debounce处理
   */
  fetchGlobalList: (keyword?: string) => Promise<
    {
      type: DynamicContextType<T>[keyof DynamicContextType<T>];
      context: z.AnyZodObject;
    }[]
  >;
}
