// 工具渲染器组件导出
export { default as ThinkToolRenderer } from './ThinkToolRenderer';
export { default as FileReadToolRenderer } from './FileReadToolRenderer';
export { default as GenericToolRenderer } from './GenericToolRenderer';

// 类型定义导出
export interface ToolRenderProps {
  data: any;
  type: 'args' | 'result';
  toolName: string;
}
