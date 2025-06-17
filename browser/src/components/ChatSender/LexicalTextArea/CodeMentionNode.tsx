import {
  DecoratorNode,
  type EditorConfig,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import React from 'react';

export type SerializedCodeMentionNode = Spread<
  {
    mentionId: string;
    value: string;
    className?: string;
    displayText: string;
  },
  SerializedLexicalNode
>;

export class CodeMentionNode extends DecoratorNode<JSX.Element> {
  __mentionId: string;

  __value: string;

  __className?: string;

  __displayText: string;

  static getType(): string {
    return 'code-mention';
  }

  static clone(node: CodeMentionNode): CodeMentionNode {
    return new CodeMentionNode(
      node.__mentionId,
      node.__value,
      node.__displayText,
      node.__className,
      node.__key,
    );
  }

  constructor(
    mentionId: string,
    value: string,
    displayText: string,
    className?: string,
    key?: NodeKey,
  ) {
    super(key);
    this.__mentionId = mentionId;
    this.__value = value;
    this.__className = className;
    this.__displayText = displayText;
  }

  static importJSON(
    serializedNode: SerializedCodeMentionNode,
  ): CodeMentionNode {
    const { mentionId, value, className, displayText } = serializedNode;
    return new CodeMentionNode(mentionId, value, displayText, className);
  }

  exportJSON(): SerializedCodeMentionNode {
    return {
      type: 'code-mention',
      version: 1,
      mentionId: this.__mentionId,
      value: this.__value,
      className: this.__className,
      displayText: this.__displayText,
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
    // 可自定义渲染
    return (
      <span
        className={this.__className || 'code-mention-node'}
        data-mention-id={this.__mentionId}
        contentEditable={false}
        style={{ userSelect: 'all' }}
      >
        {this.__displayText}
      </span>
    );
  }

  // 控制 getTextContent() 的返回值
  getTextContent(): string {
    return this.__value;
  }
}

// 工厂方法，供插入指令使用
export function $createCodeMentionNode(
  mentionId: string,
  value: string,
  displayText: string,
  className?: string,
): CodeMentionNode {
  return new CodeMentionNode(mentionId, value, displayText, className);
}

// 判断节点类型
export function $isCodeMentionNode(node: unknown): node is CodeMentionNode {
  return node instanceof CodeMentionNode;
}
