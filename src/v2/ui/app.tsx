import { Box, Static, Text } from 'ink';
import TextInput from 'ink-text-input';
import React from 'react';
import { useSnapshot } from 'valtio';
import { Message, UserMessage, AssistantTextMessage, AssistantToolMessage, ToolMessage, ThinkingMessage, SystemMessage } from './store';
import { getStore } from './store';
import SelectInput from 'ink-select-input';

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
  const name = message.content.toolName;
  const args = message.content.args;
  let description = '';
  switch (name) {
    case 'read':
      description = args.file_path;
      break;
    case 'bash':
      description = args.command;
      break;
    case 'edit':
      description = args.file_path;
      break;
    case 'write':
      description = args.file_path;
      break;
    case 'fetch':
      description = args.url;
      break;
    case 'glob':
      description = args.pattern;
      break;
    case 'grep':
      description = args.pattern;
      break;
    case 'ls':
      description = args.dir_path;
      break;
    default:
      break;
  }
  return (
    <Box>
      <Text bold color="greenBright">
        {`${name}`}
      </Text>
      {description && <Text color="green">{`(${description})`}</Text>}
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
    if (value.trim() === '') return;
    setValue('');
    store.actions.query(value);
  };
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        borderStyle="round"
        borderColor={isProcessing ? 'gray' : 'blueBright'}
        paddingX={1}
        flexDirection="row"
        gap={1}
      >
        <Text color={isProcessing ? 'gray' : 'white'}>&gt;</Text>
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

function PlanModal() {
  const store = getStore();
  const snap = useSnapshot(store);
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1}>
      <Text>Here is the plan:</Text>
      <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1}>
        <Text>{snap.planModal!.text}</Text>
      </Box>
      <Text>Do you want to proceed?</Text>
      <SelectInput items={[{
        label: 'Yes',
        value: true,
      }, {
        label: 'No, I want to edit the plan',
        value: false,
      }]} onSelect={(item) => {
        if (item.value) {
          store.stage = 'code';
          store.planModal = null;
          store.actions.query(snap.planModal!.text);
        } else {
          store.stage = 'plan';
          store.planModal = null;
        }
      }} />
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
      {snap.planModal ? <PlanModal /> : <ChatInput />}
    </Box>
  );
}
