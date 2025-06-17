import {
  DecoratorNode,
  type EditorConfig,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import React from 'react';

export type SerializedFileMentionNode = Spread<
  {
    mentionId: string;
    value: string;
    className?: string;
    displayText: string;
  },
  SerializedLexicalNode
>;

export class FileMentionNode extends DecoratorNode<JSX.Element> {
  __mentionId: string;

  __value: string;

  __className?: string;

  __displayText: string;

  static getType(): string {
    return 'file-mention';
  }

  static clone(node: FileMentionNode): FileMentionNode {
    return new FileMentionNode(
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
    serializedNode: SerializedFileMentionNode,
  ): FileMentionNode {
    const { mentionId, value, className, displayText } = serializedNode;
    return new FileMentionNode(mentionId, value, displayText, className);
  }

  exportJSON(): SerializedFileMentionNode {
    return {
      type: 'file-mention',
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
    return (
      <span
        className={this.__className || 'file-mention-node'}
        data-mention-id={this.__mentionId}
        contentEditable={false}
        style={{ userSelect: 'all' }}
      >
        {this.__displayText}
      </span>
    );
  }

  getTextContent(): string {
    return this.__value;
  }
}

export function $createFileMentionNode(
  mentionId: string,
  value: string,
  displayText: string,
  className?: string,
): FileMentionNode {
  return new FileMentionNode(mentionId, value, displayText, className);
}

export function $isFileMentionNode(node: unknown): node is FileMentionNode {
  return node instanceof FileMentionNode;
}
