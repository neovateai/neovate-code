import { Box, Static, Text } from 'ink';
import TextInput from './ink-text-input';
import React from 'react';
import { useSnapshot } from 'valtio';
import SelectInput from 'ink-select-input';
import Markdown from './ink-markdown';
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

function AssistantTextMessage({ message, dynamic }: { message: AssistantTextMessage, dynamic?: boolean }) {
  const snap = getStore();
  const productName = snap.generalInfo.productName.toLowerCase();
  return (
    <Box flexDirection="column">
      <Text bold color="magentaBright">
        {productName}
      </Text>
      {dynamic ? <Text>{message.content.text}</Text> : <Markdown>{message.content.text}</Markdown>}
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
  const result = (() => {
    const result = message.content.result;
    const toolName = message.content.toolName;
    const success = result.success;
    switch (toolName) {
      case 'read':
        if (success) {
          const lines = result.data.totalLines;
          return `Read ${lines} lines.`;
        }
      case 'bash':
        if (success) {
          return result.output.trim();
        }
      case 'edit':
        return result;
      case 'write':
        return result;
      case 'ls':
        return result;
      case 'fetch':
        if (success) {
          return result.data.result;
        }
      default:
        break;
    }
    return JSON.stringify(message.content.result);
  })();
  return (
    <Box flexDirection="column">
      <Text color="gray">↳ {result}</Text>
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

function Message({ message, dynamic }: { message: Message, dynamic?: boolean }) {
  const messageComponent = (() => {
    switch (message.role) {
      case 'user':
        return <UserMessage message={message} />;
      case 'assistant':
        return message.content.type === 'text' ? (
          <AssistantTextMessage message={message as AssistantTextMessage} dynamic={dynamic} />
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
  const isPlan = store.stage === 'plan';
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
          <Text color="gray">{isPlan ? 'Planning...' : 'Processing...'}</Text>
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

function PlanModalSelectInput() {
  const store = getStore();
  const snap = useSnapshot(store);
  return (
    <SelectInput
      items={[{
        label: 'Yes',
        value: true,
      }, {
        label: 'No, I want to edit the plan',
        value: false,
      }]}
      onSelect={(item) => {
        if (item.value) {
          store.stage = 'code';
          store.planModal = null;
          store.actions.query(snap.planModal!.text);
        } else {
          store.stage = 'plan';
          store.planModal = null;
        }
      }}
    />
  );
}

function PlanModal() {
  const store = getStore();
  const snap = useSnapshot(store);
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1}>
      <Text bold>Here is the plan:</Text>
      <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1}>
        <Markdown>{snap.planModal!.text}</Markdown>
      </Box>
      <Box marginY={1}>
        <Text bold>Do you want to proceed?</Text>
      </Box>
      <PlanModalSelectInput />
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
      {snap.currentMessage && <Message message={snap.currentMessage} dynamic />}
      {snap.planModal ? <PlanModal /> : <ChatInput />}
    </Box>
  );
}
