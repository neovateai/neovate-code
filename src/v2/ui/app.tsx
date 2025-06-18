import { Box, Static, Text } from 'ink';
import TextInput from 'ink-text-input';
import React from 'react';
import { useSnapshot } from 'valtio';
import { Message, UserMessage, AssistantTextMessage, AssistantToolMessage, ToolMessage, ThinkingMessage, SystemMessage } from './store';
import { getStore } from './store';

function UserMessage({ message }: { message: UserMessage }) {
  return (
    <Box flexDirection="column">
      <Text bold color="blueBright">
        user
      </Text>
      <Text>{message.content.text}</Text>
    </Box>
  );
}

function ThinkingMessage({ message }: { message: ThinkingMessage }) {
  return (
    <Box flexDirection="column">
      <Text bold color="gray">
        thinking
      </Text>
      <Text color="gray" italic>
        {message.content.text}
      </Text>
    </Box>
  );
}

function AssistantTextMessage({ message }: { message: AssistantTextMessage }) {
  const snap = getStore();
  const productName = snap.generalInfo.productName.toLowerCase();
  return (
    <Box flexDirection="column">
      <Text bold color="magentaBright">
        {productName}
      </Text>
      <Text>{message.content.text}</Text>
    </Box>
  );
}

function AssistantToolMessage({ message }: { message: AssistantToolMessage }) {
  return (
    <Box flexDirection="column">
      <Text bold color="greenBright">
        {`tool (${message.content.toolName})`}
      </Text>
    </Box>
  );
}

function ToolMessage({ message }: { message: ToolMessage }) {
  return (
    <Box flexDirection="column">
      <Text color="gray">↳ {JSON.stringify(message.content.result)}</Text>
    </Box>
  );
}

function SystemMessage({ message }: { message: SystemMessage }) {
  return (
    <Box flexDirection="column">
      <Text bold color="redBright">
        system
      </Text>
      <Text>{message.content.text}</Text>
    </Box>
  );
}

function Message({ message }: { message: Message }) {
  const messageComponent = (() => {
    switch (message.role) {
      case 'user':
        return <UserMessage message={message} />;
      case 'assistant':
        return message.content.type === 'text' ? (
          <AssistantTextMessage message={message as AssistantTextMessage} />
        ) : message.content.type === 'thinking' ? (
          <ThinkingMessage message={message as ThinkingMessage} />
        ) : (
          <AssistantToolMessage message={message as AssistantToolMessage} />
        );
      case 'system':
        return <SystemMessage message={message} />;
      case 'tool':
        return <ToolMessage message={message} />;
    }
  })();
  const marginTop = message.role === 'tool' ? 0 : 1;
  const marginLeft = message.role === 'user' ? 0 : 4;
  return (
    <Box marginTop={marginTop} marginLeft={marginLeft}>
      {messageComponent}
    </Box>
  );
}

function Header() {
  const snap = useSnapshot(getStore());
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box flexDirection="row" gap={1}>
        <Text bold color="white">
          {snap.generalInfo.productName}
        </Text>
        <Text color="gray">v{snap.generalInfo.version}</Text>
      </Box>
    </Box>
  );
}

function ChatInput() {
  const store = getStore();
  const isProcessing = store.status === 'processing';
  const [value, setValue] = React.useState('');
  const handleSubmit = () => {
    setValue('');
    store.actions.query(value);
  };
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        flexDirection="row"
        gap={1}
      >
        <Text color="white">&gt;</Text>
        {isProcessing ? (
          <Text color="gray">Processing...</Text>
        ) : (
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
          />
        )}
      </Box>
      <Box flexDirection="row" paddingX={2} gap={1}>
        <Text color="gray">ctrl+c to exit | enter to send</Text>
        <Box flexGrow={1} />
      </Box>
    </Box>
  );
}

export function App() {
  const snap = useSnapshot(getStore());
  return (
    <Box flexDirection="column">
      <Static items={['header', ...snap.messages] as any[]}>
        {(item, index) => {
          if (item === 'header') {
            return <Header key={'header'} />;
          }
          return <Message key={index} message={item} />;
        }}
      </Static>
      {snap.currentMessage && <Message message={snap.currentMessage} />}
      <ChatInput />
    </Box>
  );
}
