import { Box, Static, Text } from 'ink';
import pc from 'picocolors';
import React, { useEffect, useState } from 'react';
import type {
  AssistantMessage,
  NormalizedMessage,
  ToolMessage,
  ToolResultPart,
  ToolUsePart,
  UserMessage,
} from '../message';
import {
  getMessageText,
  isCanceledMessage,
  isToolResultMessage,
} from '../message';
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

export function Messages() {
  const { messages, productName, sessionId } = useAppStore();
  return (
    <Box flexDirection="column">
      <Static key={sessionId} items={['header', ...messages] as any[]}>
        {(item, index) => {
          if (item === 'header') {
            return <Header key={'header'} />;
          }
          return (
            <Message key={index} message={item} productName={productName} />
          );
        }}
      </Static>
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
  const { productName } = useAppStore();
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>Tips to getting started:</Text>
      <Text>1. Input a task</Text>
      <Text>
        2. <Text bold>/init</Text> to create a {productName.toUpperCase()}.md
        file
      </Text>
      <Text>
        3. <Text bold>shift + tab</Text> to swith to plan mode
      </Text>
      <Text>
        4. <Text bold>/help</Text> for more information
      </Text>
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
        ⚠ Model Configuration Required
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
              `✓ Envs: ${enrichedProvider.validEnvs.join(', ')}`,
            );
          }

          // Add API key status
          if (enrichedProvider.hasApiKey) {
            descriptions.push('✓ Logged');
          }

          const description = descriptions.join(' | ');

          return (
            <Box key={enrichedProvider.id}>
              <Text color="cyan">• {enrichedProvider.name}</Text>
              {description && <Text> → {pc.gray(`(${description})`)}</Text>}
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text>Suggested actions:</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>
            •{' '}
            <Text bold color="cyan">
              /login
            </Text>{' '}
            - Configure API key for a provider
          </Text>
          <Text>
            •{' '}
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

function User({ message }: { message: UserMessage }) {
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
        user
      </Text>
      {isCanceled ? (
        <Text color={UI_COLORS.CANCELED}>User canceled the request</Text>
      ) : (
        <Text>{text}</Text>
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
    <Box
      flexDirection="column"
      marginTop={SPACING.MESSAGE_MARGIN_TOP}
      marginLeft={SPACING.MESSAGE_MARGIN_LEFT}
    >
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
    <Box
      marginTop={SPACING.MESSAGE_MARGIN_TOP}
      marginLeft={SPACING.MESSAGE_MARGIN_LEFT}
    >
      <Text bold color={UI_COLORS.TOOL}>
        {displayName || name}
      </Text>
      {description && (
        <Text color={UI_COLORS.TOOL_DESCRIPTION}>({description})</Text>
      )}
    </Box>
  );
}

function Assistant({
  message,
  productName,
}: {
  message: AssistantMessage;
  productName: string;
}) {
  if (typeof message.content === 'string') {
    return <AssistantText text={message.content} productName={productName} />;
  }
  // Don't render parts after tool use
  // Only ONE tool use is allowed
  let hasToolUse = false;
  return (
    <>
      {message.content.map((part, index) => {
        if (hasToolUse) {
          return null;
        }
        if (part.type === 'text') {
          return (
            <AssistantText
              key={index}
              text={part.text}
              productName={productName}
            />
          );
        }
        if (part.type === 'tool_use') {
          hasToolUse = true;
          return <ToolUse key={index} part={part} />;
        }
        if (part.type === 'reasoning') {
          return <Thinking key={index} text={part.text} />;
        }
        return null;
      })}
    </>
  );
}

function Thinking({ text }: { text: string }) {
  return (
    <Box
      flexDirection="column"
      marginTop={SPACING.MESSAGE_MARGIN_TOP}
      marginLeft={SPACING.MESSAGE_MARGIN_LEFT}
    >
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
  return <Text color={UI_COLORS.TOOL_RESULT}>↳ {text}</Text>;
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
      marginLeft={SPACING.MESSAGE_MARGIN_LEFT}
    >
      <ToolResultItem part={part} />
    </Box>
  );
}

type MessageProps = {
  message: NormalizedMessage;
  productName: string;
};

function Message({ message, productName }: MessageProps) {
  if (message.role === 'user') {
    const isToolResult = isToolResultMessage(message);
    if (isToolResult) {
      return <ToolResult key={message.uuid} message={message as ToolMessage} />;
    } else {
      return <User key={message.uuid} message={message as UserMessage} />;
    }
  }
  if (message.role === 'assistant') {
    return (
      <Assistant
        key={message.uuid}
        message={message as AssistantMessage}
        productName={productName}
      />
    );
  }
  return null;
}
