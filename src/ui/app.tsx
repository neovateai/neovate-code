import { Box, Static, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from './ink-text-input';
import { useSnapshot } from 'valtio';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import Markdown from './ink-markdown';
import React from 'react';
import { Message, UserMessage, AssistantTextMessage, AssistantToolMessage, ToolMessage, ThinkingMessage, SystemMessage } from './store';
import { useStore } from './hooks/use-store';
import { isSlashCommand, parseSlashCommand } from '../slash-commands';

function getStatusMessage(status: string, isPlan: boolean, currentExecutingTool: any) {
  switch (status) {
    case 'tool_approved':
      return 'Tool approved, starting execution...';
    case 'tool_executing':
      if (currentExecutingTool) {
        return `Executing ${currentExecutingTool.name}${currentExecutingTool.description ? ` (${currentExecutingTool.description})` : ''}...`;
      }
      return 'Executing tool...';
    case 'processing':
      return isPlan ? 'Planning...' : 'Processing...';
    default:
      return isPlan ? 'Planning...' : 'Processing...';
  }
}


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
    case 'glob':
      text = result.message;
      break;
    case 'grep':
      text = result;
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

function ChatInput({ setSlashCommandJSX }: { setSlashCommandJSX: (jsx: React.ReactNode) => void }) {
  const store = useStore();
  const snap = useSnapshot(store);
  const isProcessing = snap.status === 'processing';
  const isToolApproved = snap.status === 'tool_approved';
  const isToolExecuting = snap.status === 'tool_executing';
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
    store.actions.processUserInput(value, setSlashCommandJSX).catch(() => {});
  };
  let borderColor = 'blueBright';
  if (isProcessing || isToolApproved || isToolExecuting) {
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
        <Text color={isProcessing || isToolApproved || isToolExecuting || isFailed ? 'gray' : 'white'}>&gt;</Text>
        {isProcessing || isToolApproved || isToolExecuting ? (
          <Box flexDirection="row" gap={1}>
            <Text color="gray">
              <Spinner type="dots" />
            </Text>
            <Text color="gray">{getStatusMessage(snap.status, isPlan, snap.currentExecutingTool)}</Text>
          </Box>
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

function ApprovalModalSelectInput() {
  const store = useStore();
  const snap = useSnapshot(store);
  const toolKey = `${snap.approval.toolName}:${JSON.stringify(snap.approval.params)}`;
  const toolOnlyKey = snap.approval.toolName;

  return (
    <SelectInput
      items={[
        {
          label: 'Yes (once)',
          value: 'approve_once',
        },
        {
          label: 'Yes (always for this command)',
          value: 'approve_always',
        },
        {
          label: `Yes (always for ${snap.approval.toolName})`,
          value: 'approve_always_tool',
        },
        {
          label: 'No',
          value: 'deny',
        },
      ]}
      onSelect={(item) => {
        const approved = item.value !== 'deny';

        if (item.value === 'approve_always') {
          store.approvalMemory.proceedAlways.add(toolKey);
        } else if (item.value === 'approve_always_tool') {
          store.approvalMemory.proceedAlwaysTool.add(toolOnlyKey!);
        }

        store.actions.approveToolUse(approved);
      }}
    />
  );
}

function ApprovalModal() {
  const store = useStore();
  const snap = useSnapshot(store);

  if (!snap.approval.pending) return null;

  const toolName = snap.approval.toolName;
  const params = snap.approval.params;

  let description = '';
  if (params) {
    switch (toolName) {
      case 'read':
        description = params.file_path;
        break;
      case 'bash':
        description = params.command;
        break;
      case 'edit':
        description = params.file_path;
        break;
      case 'write':
        description = params.file_path;
        break;
      case 'fetch':
        description = params.url;
        break;
      case 'glob':
        description = params.pattern;
        break;
      case 'grep':
        description = params.pattern;
        break;
      case 'ls':
        description = params.dir_path;
        break;
      default:
        description = JSON.stringify(params);
        break;
    }
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
      <Text bold color="yellow">Tool Approval Required</Text>
      <Box marginY={1}>
        <Text>
          <Text bold color="greenBright">{toolName}</Text>
          {description && <Text color="green"> ({description})</Text>}
        </Text>
      </Box>
      <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1} marginY={1}>
        <Text bold>Parameters:</Text>
        <Text color="gray">{JSON.stringify(params, null, 2)}</Text>
      </Box>
      <Box marginY={1}>
        <Text bold>Do you want to allow this tool execution?</Text>
      </Box>
      <ApprovalModalSelectInput />
    </Box>
  );
}

export function App() {
  const [slashCommandJSX, setSlashCommandJSX] = React.useState<React.ReactNode | null>(null);
  const store = useStore();
  const snap = useSnapshot(store);

  const showModal = snap.planModal || snap.approval.pending;
  const modalContent = snap.planModal ? <PlanModal /> :
                      snap.approval.pending ? <ApprovalModal /> : null;

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
      {slashCommandJSX && (
        <Box marginTop={1}>
          {slashCommandJSX as React.ReactNode}
        </Box>
      )}
      {showModal ? modalContent : <ChatInput setSlashCommandJSX={setSlashCommandJSX} />}
    </Box>
  );
}
