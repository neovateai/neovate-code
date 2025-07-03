import {
  DecoratorNode,
  type EditorConfig,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import type { JSX } from 'react';
import { AI_CONTEXT_NODE_CONFIGS } from '@/constants/context';
import type { AiContextNodeConfig, AiContextNodeInfo } from '@/types/context';

export type SerializedAiContextNode = Spread<
  {
    config: { type: AiContextNodeConfig['type'] };
    info: AiContextNodeInfo;
  },
  SerializedLexicalNode
>;

export class AiContextNode extends DecoratorNode<JSX.Element> {
  __config: AiContextNodeConfig;
  __info: AiContextNodeInfo;

  static getType(): string {
    return 'ai-context';
  }

  static clone(node: AiContextNode): AiContextNode {
    return new AiContextNode(node.__config, node.__info, node.__key);
  }

  constructor(
    config: AiContextNodeConfig,
    info: AiContextNodeInfo,
    key?: NodeKey,
  ) {
    super(key);

    this.__config = config;
    this.__info = info;
  }

  static importJSON(serializedNode: SerializedAiContextNode): AiContextNode {
    const { config, info } = serializedNode;
    const foundConfig = AI_CONTEXT_NODE_CONFIGS.find(
      (c) => c.type === config.type,
    );
    if (!foundConfig) {
      throw new Error(
        `[AiContextNode] 未找到 type 为 ${config.type} 的 config，请检查 AI_CONTEXT_NODE_CONFIGS`,
      );
    }
    return new AiContextNode(foundConfig, info);
  }

  exportJSON(): SerializedAiContextNode {
    return {
      type: 'ai-context',
      version: 1,
      config: { type: this.__config.type },
      info: this.__info,
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement('span');

    return span;
  }

  updateDOM(): boolean {
    return false;
  }

  isIsolated(): boolean {
    return false; // 改为 false，允许节点被部分删除
  }

  isInline(): boolean {
    return true;
  }

  decorate(): JSX.Element {
    const { render } = this.__config;

    const node = render({ info: this.__info });

    return node;
  }

  // 控制 getTextContent() 的返回值
  getTextContent(): string {
    return this.__info.value;
  }
}

// 工厂方法，供插入指令使用
export function $createAiContextNode(
  config: AiContextNodeConfig,
  info: AiContextNodeInfo,
  key?: NodeKey,
): AiContextNode {
  return new AiContextNode(config, info, key);
}

// 判断节点类型
export function $isAiContextNode(node: unknown): node is AiContextNode {
  return node instanceof AiContextNode;
}
