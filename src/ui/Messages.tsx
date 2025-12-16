import { Box, Static, Text } from 'ink';
import pc from 'picocolors';
import React, { useMemo } from 'react';
import type {
  AssistantMessage,
  NormalizedMessage,
  ReasoningPart,
  TextPart,
  ToolMessage,
  ToolMessage2,
  ToolResultPart,
  ToolUsePart,
  UserMessage,
} from '../message';
import {
  getMessageText,
  isCanceledMessage,
  isToolResultMessage,
  isUserBashCommandMessage,
  isUserBashOutputMessage,
  toolResultPart2ToToolResultPart,
} from '../message';
import { symbols } from '../utils/symbols';
import { SPACING, UI_COLORS } from './constants';
import { DiffViewer } from './DiffViewer';
import { GradientString } from './GradientString';
import { Markdown } from './Markdown';
import { useAppStore } from './store';
import { TodoList, TodoRead } from './Todo';

interface EnrichedProvider {
  id: string;
  name: string;
  validEnvs?: string[];
  hasApiKey?: boolean;
}

function BashCommandMessage({ message }: { message: UserMessage }) {
  const command = useMemo(() => {
    if (typeof message.content !== 'string') return '';
    return message.content.replace(/<\/?bash-input>/g, '');
  }, [message.content]);
  return (
    <Box
      flexDirection="column"
      marginTop={SPACING.MESSAGE_MARGIN_TOP}
      marginLeft={SPACING.MESSAGE_MARGIN_LEFT_USER}
    >
      <Box>
        <Text color={UI_COLORS.CHAT_BORDER_BASH} bold>
          !{' '}
        </Text>
        <Text bold color={UI_COLORS.TOOL}>
          {command}
        </Text>
      </Box>
    </Box>
  );
}

function BashOutputMessage({ message }: { message: NormalizedMessage }) {
  const isError = useMemo(() => {
    if (typeof message.content !== 'string') return false;
    return message.content.startsWith('<bash-stderr>');
  }, [message.content]);

  const output = useMemo(() => {
    if (message.uiContent) {
      return message.uiContent.replace(/^\n/, '');
    }
    if (typeof message.content !== 'string') return '';
    return message.content
      .replace(/<\/?bash-stdout>/g, '')
      .replace(/<\/?bash-stderr>/g, '');
  }, [message.content, message.uiContent]);

  return (
    <Box flexDirection="column" marginLeft={SPACING.MESSAGE_MARGIN_LEFT_USER}>
      <Text color={isError ? UI_COLORS.ERROR : UI_COLORS.TOOL_RESULT}>
        {symbols.arrowDown} {output}
      </Text>
    </Box>
  );
}

type ToolPair = {
  toolUse: ToolUsePart;
  toolResult?: ToolResultPart;
};

export function splitMessages(messages: NormalizedMessage[]): {
  completedMessages: NormalizedMessage[];
  pendingMessages: NormalizedMessage[];
} {
  // 1. Find the last assistant message with tool_use from the end
  let lastToolUseIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      const hasToolUse = msg.content.some((part) => part.type === 'tool_use');
      if (hasToolUse) {
        lastToolUseIndex = i;
        break;
      }
    }
  }

  // 2. If no tool_use found, all messages go to Static
  if (lastToolUseIndex === -1) {
    return { completedMessages: messages, pendingMessages: [] };
  }

  // 3. Get all tool_use ids from the last assistant message
  const assistantMsg = messages[lastToolUseIndex] as AssistantMessage;
  if (typeof assistantMsg.content === 'string') {
    return { completedMessages: messages, pendingMessages: [] };
  }
  const toolUseIds = assistantMsg.content
    .filter(
      (p: TextPart | ReasoningPart | ToolUsePart) => p.type === 'tool_use',
    )
    .map((p: TextPart | ReasoningPart | ToolUsePart) => (p as ToolUsePart).id);

  // 4. Collect all tool results after this message
  const toolResults = new Set<string>();
  for (let i = lastToolUseIndex + 1; i < messages.length; i++) {
    const msg = messages[i];
    // Handle new format: role: 'tool'
    if (msg.role === 'tool') {
      (msg as ToolMessage2).content.forEach((part) => {
        if (part.toolCallId) {
          toolResults.add(part.toolCallId);
        }
      });
    }
    // Handle legacy format: role: 'user' with isToolResult
    else if (msg.role === 'user' && isToolResultMessage(msg)) {
      const toolMsg = msg as ToolMessage;
      if (toolMsg.content[0]) {
        toolResults.add(toolMsg.content[0].id);
      }
    }
  }

  // 5. Check if all tools are completed
  const allToolsCompleted = toolUseIds.every((id) => toolResults.has(id));

  if (allToolsCompleted) {
    return { completedMessages: messages, pendingMessages: [] };
  } else {
    return {
      completedMessages: messages.slice(0, lastToolUseIndex),
      pendingMessages: messages.slice(lastToolUseIndex),
    };
  }
}

export function pairToolsWithResults(
  assistantMsg: AssistantMessage,
  subsequentMessages: NormalizedMessage[],
): ToolPair[] {
  // Extract all tool_use parts
  if (typeof assistantMsg.content === 'string') {
    return [];
  }
  const toolUses = assistantMsg.content.filter(
    (p: TextPart | ReasoningPart | ToolUsePart) => p.type === 'tool_use',
  ) as ToolUsePart[];

  // Collect all tool results indexed by toolCallId
  const resultsMap = new Map<string, ToolResultPart>();
  for (const msg of subsequentMessages) {
    // Handle new format: role: 'tool'
    if (msg.role === 'tool') {
      (msg as ToolMessage2).content.forEach((part) => {
        resultsMap.set(part.toolCallId, toolResultPart2ToToolResultPart(part));
      });
    }
    // Handle legacy format: role: 'user' with isToolResult
    else if (msg.role === 'user' && isToolResultMessage(msg)) {
      const toolMsg = msg as ToolMessage;
      if (toolMsg.content[0]) {
        const part = toolMsg.content[0];
        resultsMap.set(part.id, part);
      }
    }
  }

  // Pair each tool_use with its result (if available)
  return toolUses.map((toolUse) => ({
    toolUse,
    toolResult: resultsMap.get(toolUse.id),
  }));
}

export function Messages() {
  const { userName, messages, productName, sessionId, forkCounter } =
    useAppStore();

  // Split messages into completed and pending
  const { completedMessages, pendingMessages } = useMemo(
    () => splitMessages(messages as NormalizedMessage[]),
    [messages],
  );

  return (
    <Box flexDirection="column">
      {/* Static area - completed messages */}
      <Static
        key={`${sessionId}-${forkCounter}`}
        items={['header', ...completedMessages] as any[]}
      >
        {(item, index) => {
          if (item === 'header') {
            return <Header key="header" />;
          }
          return (
            <MessageGroup
              key={index}
              message={item}
              messages={completedMessages}
              productName={productName}
              userName={userName}
            />
          );
        }}
      </Static>

      {/* Dynamic area - pending messages */}
      {pendingMessages.map((message, index) => (
        <MessageGroup
          key={`pending-${message.uuid || index}`}
          message={message}
          messages={pendingMessages}
          productName={productName}
          userName={userName}
        />
      ))}
    </Box>
  );
}

function ProductASCIIArt() {
  const { productASCIIArt } = useAppStore();
  if (!productASCIIArt) return null;
  return (
    <Box>
      <GradientString
        text={productASCIIArt}
        colors={['#FF3070', '#FF6B9D']}
        multiline
      />
    </Box>
  );
}

function ProductInfo() {
  const { productName, version } = useAppStore();
  return (
    <Box marginTop={1}>
      <GradientString
        text={productName.toUpperCase()}
        colors={['#FF3070', '#FF6B9D']}
        multiline
      />
      <Text color={UI_COLORS.PRODUCT_VERSION}> v{version}</Text>
    </Box>
  );
}

function GettingStartedTips() {
  const { productName, initializeModelError } = useAppStore();
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>Tips to getting started:</Text>
      <Text>1. Input a task</Text>
      <Text>
        2. <Text bold>/init</Text> to create a AGENTS.md file
      </Text>
      <Text>
        3. <Text bold>shift + tab</Text> to switch to plan mode
      </Text>
      <Text>
        4. <Text bold>/help</Text> for more information
      </Text>
      {initializeModelError && (
        <Box marginTop={1}>
          <Text color="red">
            {symbols.warning} {initializeModelError}
          </Text>
        </Box>
      )}
    </Box>
  );
}

function ModelConfigurationWarning() {
  const { model, providers } = useAppStore();
  if (model) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      marginTop={1}
      borderStyle="round"
      borderColor="yellow"
      padding={1}
    >
      <Text bold color="yellow">
        ! Model Configuration Required
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          You haven't configured a model yet. Here are available providers:
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {Object.values(providers).map((provider) => {
          const enrichedProvider = provider as unknown as EnrichedProvider;
          const descriptions: string[] = [];

          // Add valid environment variables info
          if (
            enrichedProvider.validEnvs &&
            enrichedProvider.validEnvs.length > 0
          ) {
            descriptions.push(
              `${symbols.tick} Envs: ${enrichedProvider.validEnvs.join(', ')}`,
            );
          }

          // Add API key status
          if (enrichedProvider.hasApiKey) {
            descriptions.push(`${symbols.tick} Logged`);
          }

          const description = descriptions.join(' | ');

          return (
            <Box key={enrichedProvider.id}>
              <Text color="cyan">
                {symbols.bullet} {enrichedProvider.name}
              </Text>
              {description && <Text> → {pc.gray(`(${description})`)}</Text>}
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text>Suggested actions:</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>
            {symbols.bullet}{' '}
            <Text bold color="cyan">
              /login
            </Text>{' '}
            - Configure API key for a provider
          </Text>
          <Text>
            {symbols.bullet}{' '}
            <Text bold color="cyan">
              /model
            </Text>{' '}
            - Select a model to use
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

function Header() {
  return (
    <Box flexDirection="column" paddingY={1}>
      <ProductASCIIArt />
      <ProductInfo />
      <GettingStartedTips />
      <ModelConfigurationWarning />
    </Box>
  );
}

function User({
  message,
  userName,
}: {
  message: UserMessage;
  userName: string;
}) {
  const text = getMessageText(message);
  const isCanceled = isCanceledMessage(message);
  if (message.hidden) {
    return null;
  }
  return (
    <Box
      flexDirection="column"
      marginTop={SPACING.MESSAGE_MARGIN_TOP}
      marginLeft={SPACING.MESSAGE_MARGIN_LEFT_USER}
    >
      <Text bold color={UI_COLORS.USER}>
        {userName}
      </Text>
      {isCanceled ? (
        <Text color={UI_COLORS.CANCELED}>User canceled the request</Text>
      ) : (
        <Box>
          <Text backgroundColor="#555555" color="#cdcdcd">
            {text}{' '}
          </Text>
        </Box>
      )}
    </Box>
  );
}

function AssistantText({
  text,
  productName,
}: {
  text: string;
  productName: string;
}) {
  return (
    <Box flexDirection="column" marginTop={SPACING.MESSAGE_MARGIN_TOP}>
      <Text bold color="#FF3070">
        {productName.toLowerCase()}
      </Text>
      <Markdown>{text}</Markdown>
    </Box>
  );
}

function ToolUse({ part }: { part: ToolUsePart }) {
  const { name, displayName } = part;
  const description = part.description;
  return (
    <Box marginTop={SPACING.MESSAGE_MARGIN_TOP}>
      <Text bold color={UI_COLORS.TOOL}>
        {displayName || name}
      </Text>
      {description && (
        <Text color={UI_COLORS.TOOL_DESCRIPTION}>({description})</Text>
      )}
    </Box>
  );
}

function ToolPair({ pair }: { pair: ToolPair }) {
  return (
    <Box flexDirection="column">
      {/* Render ToolUse */}
      <ToolUse part={pair.toolUse} />

      {/* Render ToolResult if available */}
      {pair.toolResult && (
        <Box marginTop={SPACING.MESSAGE_MARGIN_TOP_TOOL_RESULT}>
          <ToolResultItem part={pair.toolResult} />
        </Box>
      )}
    </Box>
  );
}

function AssistantWithTools({
  message,
  messages,
  productName,
}: {
  message: AssistantMessage;
  messages: NormalizedMessage[];
  productName: string;
}) {
  // If it's a pure string, render directly
  if (typeof message.content === 'string') {
    return <AssistantText text={message.content} productName={productName} />;
  }

  // Separate text/thinking and tool_use parts
  const textParts = message.content.filter(
    (p) => p.type === 'text' || p.type === 'reasoning',
  );
  const toolUseParts = message.content.filter((p) => p.type === 'tool_use');

  // If no tool_use, render with original logic
  if (toolUseParts.length === 0) {
    return (
      <>
        {textParts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <AssistantText
                key={`text-${index}`}
                text={(part as TextPart).text}
                productName={productName}
              />
            );
          }
          if (part.type === 'reasoning') {
            return (
              <Thinking
                key={`thinking-${index}`}
                text={(part as ReasoningPart).text}
              />
            );
          }
          return null;
        })}
      </>
    );
  }

  // Find current message position in the array
  const currentIndex = messages.findIndex(
    (m) =>
      (m as NormalizedMessage).uuid === (message as NormalizedMessage).uuid,
  );
  const subsequentMessages =
    currentIndex >= 0 ? messages.slice(currentIndex + 1) : [];

  // Pair tool_use with tool_result
  const toolPairs = pairToolsWithResults(message, subsequentMessages);

  return (
    <>
      {/* Render text parts */}
      {textParts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <AssistantText
              key={`text-${index}`}
              text={(part as TextPart).text}
              productName={productName}
            />
          );
        }
        if (part.type === 'reasoning') {
          return (
            <Thinking
              key={`thinking-${index}`}
              text={(part as ReasoningPart).text}
            />
          );
        }
        return null;
      })}

      {/* Render paired tool_use + tool_result */}
      {toolPairs.map((pair) => (
        <ToolPair key={pair.toolUse.id} pair={pair} />
      ))}
    </>
  );
}

function Thinking({ text }: { text: string }) {
  return (
    <Box flexDirection="column" marginTop={SPACING.MESSAGE_MARGIN_TOP}>
      <Text bold color="gray">
        thinking
      </Text>
      <Text color="gray" italic>
        {text}
      </Text>
    </Box>
  );
}

function ToolResultItem({ part }: { part: ToolResultPart }) {
  const { result, input } = part;
  if (result.isError) {
    let text = result.returnDisplay || result.llmContent;
    if (typeof text !== 'string') {
      text = JSON.stringify(text);
    }
    return <Text color={UI_COLORS.ERROR}>{text}</Text>;
  }

  const returnDisplayTypes = ['diff_viewer', 'todo_read', 'todo_write'];
  if (
    typeof result.returnDisplay === 'object' &&
    returnDisplayTypes.includes(result.returnDisplay.type)
  ) {
    switch (result.returnDisplay.type) {
      case 'diff_viewer': {
        const { originalContent, newContent, filePath } = result.returnDisplay;
        const originalContentValue =
          typeof originalContent === 'string'
            ? originalContent
            : input[originalContent.inputKey];
        const newContentValue =
          typeof newContent === 'string'
            ? newContent
            : input[newContent.inputKey];
        return (
          <DiffViewer
            originalContent={originalContentValue}
            newContent={newContentValue}
            fileName={filePath}
          />
        );
      }
      case 'todo_read':
        return <TodoRead todos={result.returnDisplay.todos} />;
      case 'todo_write':
        return (
          <TodoList
            oldTodos={result.returnDisplay.oldTodos}
            newTodos={result.returnDisplay.newTodos}
            verbose={false}
          />
        );
      default:
        break;
    }
  }

  let text = result.returnDisplay || result.llmContent;
  if (typeof text !== 'string') {
    text = JSON.stringify(text);
  }
  return (
    <Text color={UI_COLORS.TOOL_RESULT}>
      {symbols.arrowDown} {text}
    </Text>
  );
}

function ToolResult({ message }: { message: ToolMessage }) {
  if (message.content.length === 0) {
    return null;
  }
  const part = message.content[0];
  return (
    <Box
      flexDirection="column"
      marginTop={SPACING.MESSAGE_MARGIN_TOP_TOOL_RESULT}
    >
      <ToolResultItem part={part} />
    </Box>
  );
}

type MessageGroupProps = {
  message: NormalizedMessage;
  messages: NormalizedMessage[];
  productName: string;
  userName: string;
};

function MessageGroup({
  message,
  messages,
  productName,
  userName,
}: MessageGroupProps) {
  // If it's a user message
  if (message.role === 'user') {
    if (isUserBashCommandMessage(message)) {
      return <BashCommandMessage message={message as UserMessage} />;
    } else if (isUserBashOutputMessage(message)) {
      return <BashOutputMessage message={message as NormalizedMessage} />;
    }

    const isToolResult = isToolResultMessage(message);
    if (isToolResult) {
      return <ToolResult message={message as ToolMessage} />;
    }
    return <User message={message as UserMessage} userName={userName} />;
  }

  // If it's a tool message (already paired in assistant, skip rendering)
  if (message.role === 'tool') {
    return null;
  }

  // If it's an assistant message
  if (message.role === 'assistant') {
    return (
      <AssistantWithTools
        message={message as AssistantMessage}
        messages={messages}
        productName={productName}
      />
    );
  }

  return null;
}
