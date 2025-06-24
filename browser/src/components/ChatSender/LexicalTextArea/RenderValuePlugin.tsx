import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type LexicalNode,
  TextNode,
} from 'lexical';
import { useContext, useEffect, useRef } from 'react';
import type { AiContextCacheNode, AppendedLexicalNode } from '@/types/context';
import { LexicalTextAreaContext } from '../LexicalTextAreaContext';
import { $createAiContextNode } from './AiContextNode';

interface Props {
  value: string;
}

const RenderValuePlugin = (props: Props) => {
  const { value } = props;
  const [editor] = useLexicalComposerContext();
  const { aiContextNodeConfigs, onChangeNodes, onChangePlainText } = useContext(
    LexicalTextAreaContext,
  );
  const oldValueRef = useRef('');
  const oldNodesRef = useRef<AiContextCacheNode[]>([]);
  const oldLexicalNodesRef = useRef<AppendedLexicalNode[]>([]);

  const SearchRegex = new RegExp(
    aiContextNodeConfigs
      .map((config, index) => `(?<group${index}>${config.matchRegex.source})`)
      .join('|'),
    'g',
  );

  const isNodeEqual = (
    node1: AiContextCacheNode,
    node2: AiContextCacheNode,
  ) => {
    return (
      node1.type === node2.type &&
      node1.originalText === node2.originalText &&
      node1.displayText === node2.displayText
    );
  };

  const areNodesEqual = (
    nodes1: AiContextCacheNode[],
    nodes2: AiContextCacheNode[],
  ) => {
    if (nodes1.length !== nodes2.length) return false;
    return nodes1.every((node1, index) => {
      const node2 = nodes2[index];
      return isNodeEqual(node1, node2);
    });
  };

  const parseContent = (content: string) => {
    const nodes: AiContextCacheNode[] = [];
    const paragraph = $createParagraphNode();

    const Regex = new RegExp(SearchRegex);

    let lastIndex = 0;
    let plainText = '';
    let match: RegExpExecArray | null;
    let targetFunction: (() => void) | null = null;

    // 用于临时存储所有节点的数组（包括文本节点和AiContextNode节点）
    const allNodes: LexicalNode[] = [];

    while ((match = Regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const text = content.slice(lastIndex, match.index);
        const textNode = $createTextNode(text);
        plainText += text;
        paragraph.append(textNode);
        allNodes.push(textNode);
      }

      const matchValue = match.groups?.value;
      const originalConfigIndex =
        match.findIndex((item) => item === matchValue) / 2 - 1;

      const originalConfig = aiContextNodeConfigs[originalConfigIndex];

      if (originalConfig) {
        const info = originalConfig.pickInfo?.(match);

        if (!info) {
          console.warn(
            `[LexicalTextArea] 无法从match中提取信息，请检查matchRegex和pickInfo是否正确。`,
          );
          continue;
        }

        const mentionNode = $createAiContextNode(originalConfig, info);
        paragraph.append(mentionNode);
        allNodes.push(mentionNode);
        nodes.push({
          type: originalConfig.type,
          originalText: info.value,
          displayText: info.displayText,
          lexicalNode: mentionNode,
        });
        plainText += info.displayText;
      }
      lastIndex = Regex.lastIndex;
    }
    if (lastIndex < content.length) {
      const text = content.slice(lastIndex);
      const textNode = $createTextNode(text);
      plainText += text;
      paragraph.append(textNode);
      allNodes.push(textNode);
    }

    const prevNodes = oldNodesRef.current;
    const isAddingMentionNode = nodes.length > prevNodes.length;
    const isRemovingMentionNode = nodes.length < prevNodes.length;

    // 处理光标位置
    targetFunction = () => {
      if (isAddingMentionNode) {
        // 找到新插入的mention节点
        let insertedNodeIndex = -1;

        for (let i = 0; i < nodes.length; i++) {
          if (i >= prevNodes.length || !isNodeEqual(nodes[i], prevNodes[i])) {
            insertedNodeIndex = i;
            break;
          }
        }

        if (insertedNodeIndex !== -1) {
          const insertedNode = nodes[insertedNodeIndex].lexicalNode;
          insertedNode.selectEnd();
        }
      } else if (isRemovingMentionNode) {
        // 删除情况
        // 找到被删除节点的位置
        let deletedIndex = 0;
        for (let i = 0; i < prevNodes.length; i++) {
          if (i >= nodes.length || !isNodeEqual(nodes[i], prevNodes[i])) {
            deletedIndex = i;
            break;
          }
        }

        // 在变更前的状态中找到被删除节点前后的节点
        const oldNodes = oldLexicalNodesRef.current;
        let mentionCount = 0;
        let targetIndex = -1;

        // 遍历找到被删除的mention节点的位置
        for (let i = 0; i < oldNodes.length; i++) {
          const node = oldNodes[i];
          if (node.type !== 'text') {
            if (mentionCount === deletedIndex) {
              targetIndex = i;
              break;
            }
            mentionCount++;
          }
        }

        if (targetIndex !== -1) {
          const prevNode = oldNodes[targetIndex - 1];
          const nextNode = oldNodes[targetIndex + 1];

          if (prevNode?.type === 'text' && nextNode?.type === 'text') {
            // 如果前后都是文本节点，记录前一个文本节点的长度
            const prevTextLength = prevNode.length;

            // 获取合并后的文本节点（它将位于删除位置）
            const mergedTextNode = paragraph.getChildren()[targetIndex - 1];
            if (mergedTextNode && mergedTextNode.getType() === 'text') {
              (mergedTextNode as TextNode).select(
                prevTextLength,
                prevTextLength,
              );
            }
          } else if (nextNode) {
            // 否则选中当前位置的开始
            const correspondingNode = paragraph.getChildren()[targetIndex];
            if (correspondingNode) {
              correspondingNode.selectStart();
            }
          } else if (prevNode) {
            // 如果是最后一个节点被删除，选中前一个节点的末尾
            const correspondingNode = paragraph.getChildren()[targetIndex - 1];
            if (correspondingNode) {
              correspondingNode.selectEnd();
            }
          }
        }
      }
    };

    return { nodes, paragraph, plainText, resetSelection: targetFunction };
  };

  useEffect(() => {
    if (oldValueRef.current === value) {
      return;
    }

    editor.update(() => {
      const root = $getRoot();
      const { nodes, paragraph, plainText, resetSelection } =
        parseContent(value);

      const shouldRebuild =
        root.getTextContent() !== value ||
        !areNodesEqual(nodes, oldNodesRef.current);

      if (shouldRebuild) {
        root.clear();
        root.append(paragraph);

        resetSelection?.();

        onChangeNodes?.(oldNodesRef.current, nodes);
        oldNodesRef.current = nodes;
      }

      oldLexicalNodesRef.current = paragraph
        .getChildren()
        .map((lexicalNode) => {
          return {
            lexicalNode,
            type: lexicalNode.getType(),
            length: lexicalNode.getTextContentSize(),
          };
        });

      onChangePlainText?.(plainText);
    });

    oldValueRef.current = value;
  }, [value, editor, onChangeNodes, onChangePlainText]);

  return null;
};

export default RenderValuePlugin;
