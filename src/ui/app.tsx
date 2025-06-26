import { Box, Static, Text, useInput } from 'ink';
import TextInput from './ink-text-input';
import { useSnapshot } from 'valtio';
import SelectInput from 'ink-select-input';
import Markdown from './ink-markdown';
import React from 'react';
import { Message, UserMessage, AssistantTextMessage, AssistantToolMessage, ToolMessage, ThinkingMessage, SystemMessage } from './store';
import { useStore } from './hooks/use-store';

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
  const store = useStore();
  const snap = useSnapshot(store);
  const productName = snap.productName.toLowerCase();
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
  const result = message.content.result;
  const toolName = message.content.toolName;
  const success = result.success;
  const error = result.error;
  if (!success && error) {
    return (
      <Box flexDirection="column">
        <Text color="red">{error}</Text>
      </Box>
    );
  }
  let text = '';
  switch (toolName) {
    case 'read':
      if (success) {
        const lines = result.data.totalLines;
        text = `Read ${lines} lines.`;
      }
      break;
    case 'bash':
      if (success) {
        text = result.output.trim();
      }
      break;
    case 'edit':
      text = result;
      break;
    case 'write':
      text = result;
      break;
    case 'ls':
      text = result;
      break;
    case 'fetch':
      if (success) {
        text = result.data.result;
      }
      break;
    default:
      break;
  }
  text = text || JSON.stringify(result);
  return (
    <Box flexDirection="column">
      <Text color="gray">↳ {text}</Text>
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
        if (message.content.type === 'thinking') {
          return <ThinkingMessage message={message as ThinkingMessage} />;
        }
        if (message.content.type === 'text') {
          return <AssistantTextMessage message={message as AssistantTextMessage} dynamic={dynamic} />;
        }
        return <AssistantToolMessage message={message as AssistantToolMessage} />;
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

function GeneralInfoPanel({ generalInfo }: { generalInfo: Record<string, string> }) {
  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      minWidth={64}
      flexDirection="column"
    >
      {Object.entries(generalInfo).map(([key, value], index) => (
        <Text key={index} dimColor>
          <Text color="blueBright">↳ </Text>
          {key}: <Text bold>{value}</Text>
        </Text>
      ))}
    </Box>
  );
}

function Header() {
  const store = useStore();
  const snap = useSnapshot(store);
  const { productName, version, generalInfo } = snap;
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box flexDirection="row" gap={1}>
        <Text bold color="white">
          {productName}
        </Text>
        <Text color="gray">v{version}</Text>
      </Box>
      <Box marginTop={1}>
        <GeneralInfoPanel generalInfo={generalInfo} />
      </Box>
    </Box>
  );
}

function ChatInput() {
  const store = useStore();
  const snap = useSnapshot(store);
  const isProcessing = snap.status === 'processing';
  const isFailed = snap.status === 'failed';
  const isPlan = snap.stage === 'plan';
  const [value, setValue] = React.useState('');
  useInput((input, key) => {
    if (key.upArrow) {
      const history = store.actions.chatInputUp(value);
      setValue(history);
    }
    if (key.downArrow) {
      const history = store.actions.chatInputDown(value);
      setValue(history);
    }
  });
  const handleSubmit = () => {
    if (value.trim() === '') return;
    setValue('');
    store.actions.query(value).catch(() => {});
  };
  let borderColor = 'blueBright';
  if (isProcessing) {
    borderColor = 'gray';
  }
  if (isFailed) {
    borderColor = 'redBright';
  }
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        borderStyle="round"
        borderColor={borderColor as any}
        paddingX={1}
        flexDirection="row"
        gap={1}
      >
        <Text color={isProcessing || isFailed ? 'gray' : 'white'}>&gt;</Text>
        {isProcessing ? (
          <Text color="gray">{isPlan ? 'Planning...' : 'Processing...'}</Text>
        ) :
          <TextInput
            value={value}
            onChange={(input) => {
              store.actions.chatInputChange(input);
              setValue(input);
            }}
            onSubmit={handleSubmit}
          />
        }
      </Box>
      {isFailed && snap.error && (
        <Box paddingX={2}>
          <Text color="redBright">{snap.error}</Text>
        </Box>
      )}
      <Box flexDirection="row" paddingX={2} gap={1}>
        <Text color="gray">ctrl+c to exit | enter to send</Text>
        <Box flexGrow={1} />
      </Box>
    </Box>
  );
}

function PlanModalSelectInput() {
  const store = useStore();
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
  const store = useStore();
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
  const store = useStore();
  const snap = useSnapshot(store);
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
