import { render } from 'ink';
import React from 'react';
import { NormalizedMessage } from '../src/message';
import { App } from '../src/ui/App';
import { useAppStore } from '../src/ui/store';

const multileToolMessages = [
  {
    parentUuid: null,
    uuid: '55e00dcd-d215-422c-9489-d3cbdd318a57',
    role: 'user',
    content: 'create b.txt and c.txt with foooooo',
    type: 'message',
    timestamp: '2025-10-26T12:39:57.459Z',
    sessionId: 'd183d983',
  },
  {
    parentUuid: '55e00dcd-d215-422c-9489-d3cbdd318a57',
    uuid: '23447659-d914-498c-a4b0-baab509e05b0',
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'toolu_01FK23pGhXpwRQHYoqCgNHVF',
        name: 'write',
        input: {
          file_path: '/private/tmp/sorrycc-FJSqXU/b.txt',
          content: 'foooooo',
        },
        description: 'b.txt',
      },
      {
        type: 'tool_use',
        id: 'toolu_01UGyycZn2zbgmEdgU5owkLr',
        name: 'write',
        input: {
          file_path: '/private/tmp/sorrycc-FJSqXU/c.txt',
          content: 'foooooo',
        },
        description: 'c.txt',
      },
    ],
    text: '',
    model: 'anthropic/claude-sonnet-4-5-20250929',
    usage: { input_tokens: 0, output_tokens: 0 },
    type: 'message',
    timestamp: '2025-10-26T12:40:03.450Z',
    sessionId: 'd183d983',
  },
  {
    parentUuid: '23447659-d914-498c-a4b0-baab509e05b0',
    uuid: '0c9a54a9-4cad-4687-88e1-d4de4aaaff09',
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolCallId: 'toolu_01FK23pGhXpwRQHYoqCgNHVF',
        toolName: 'write',
        input: {
          file_path: '/private/tmp/sorrycc-FJSqXU/b.txt',
          content: 'foooooo',
        },
        result: {
          llmContent:
            'File successfully written to /private/tmp/sorrycc-FJSqXU/b.txt',
          returnDisplay: {
            type: 'diff_viewer',
            filePath: 'b.txt',
            absoluteFilePath: '/private/tmp/sorrycc-FJSqXU/b.txt',
            originalContent: 'foooooo\n',
            newContent: { inputKey: 'content' },
            writeType: 'replace',
          },
        },
      },
      {
        type: 'tool-result',
        toolCallId: 'toolu_01UGyycZn2zbgmEdgU5owkLr',
        toolName: 'write',
        input: {
          file_path: '/private/tmp/sorrycc-FJSqXU/c.txt',
          content: 'foooooo',
        },
        result: {
          llmContent:
            'File successfully written to /private/tmp/sorrycc-FJSqXU/c.txt',
          returnDisplay: {
            type: 'diff_viewer',
            filePath: 'c.txt',
            absoluteFilePath: '/private/tmp/sorrycc-FJSqXU/c.txt',
            originalContent: 'foooooo\n',
            newContent: { inputKey: 'content' },
            writeType: 'replace',
          },
        },
      },
    ],
    type: 'message',
    timestamp: '2025-10-26T12:40:03.454Z',
    sessionId: 'd183d983',
  },
  {
    parentUuid: '0c9a54a9-4cad-4687-88e1-d4de4aaaff09',
    uuid: '60a008d9-868f-4280-9332-33058bf74247',
    role: 'assistant',
    content: [
      { type: 'text', text: 'Done. Created b.txt and c.txt with "foooooo".' },
    ],
    text: 'Done. Created b.txt and c.txt with "foooooo".',
    model: 'anthropic/claude-sonnet-4-5-20250929',
    usage: { input_tokens: 0, output_tokens: 0 },
    type: 'message',
    timestamp: '2025-10-26T12:40:07.484Z',
    sessionId: 'd183d983',
  },
] as NormalizedMessage[];

// Sample test messages
const testMessages = [
  {
    type: 'message',
    role: 'user',
    content: 'Hello! Can you help me test the UI?',
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Hello! This is a test message from the assistant. The UI is rendering correctly.',
      },
    ],
  },
  {
    role: 'user',
    content: 'Great! Can you show me a code example?',
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Here is a simple example:\n\n```typescript\nfunction greet(name: string) {\n  console.log(`Hello, ${name}!`);\n}\n\ngreet("World");\n```\n\nThis is a basic TypeScript function.',
      },
    ],
  },
] as NormalizedMessage[];

// Comprehensive markdown test messages
const testMarkdownMessages = [
  {
    parentUuid: null,
    uuid: 'markdown-user-1',
    role: 'user',
    content: 'Show me examples of all markdown formatting',
    type: 'message',
    timestamp: '2025-10-27T10:00:00.000Z',
    sessionId: 'markdown-test',
  },
  {
    parentUuid: 'markdown-user-1',
    uuid: 'markdown-assistant-1',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: `# Headers

# H1 Header
## H2 Header
### H3 Header
#### H4 Header
##### H5 Header
###### H6 Header

---

# Text Formatting

This is **bold text** and this is __also bold__.

This is *italic text* and this is _also italic_.

This is ***bold and italic*** text.

This is ~~strikethrough~~ text.

---

# Code

Inline code: \`const x = 42\`

\`\`\`typescript
// Fenced code block with syntax highlighting
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(\`Fibonacci(10) = \${result}\`);
\`\`\`

\`\`\`javascript
// JavaScript example
const greet = (name) => {
  return \`Hello, \${name}!\`;
};
\`\`\`

\`\`\`python
# Python example
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
\`\`\`

\`\`\`json
{
  "name": "takumi",
  "version": "1.0.0",
  "description": "AI assistant"
}
\`\`\`

---

# Lists

## Unordered Lists

* Item 1
* Item 2
  * Nested item 2.1
  * Nested item 2.2
    * Deep nested item 2.2.1
* Item 3

- Alternative bullet
- Another item

## Ordered Lists

1. First item
2. Second item
   1. Nested item 2.1
   2. Nested item 2.2
3. Third item

## Task Lists

- [x] Completed task
- [x] Another completed task
- [ ] Pending task
- [ ] Another pending task
  - [x] Nested completed subtask
  - [ ] Nested pending subtask

---

# Links and References

[Anthropic](https://anthropic.com)

[Link with title](https://claude.ai "Claude AI")

<https://example.com>

---

# Blockquotes

> This is a blockquote.
> It can span multiple lines.

> **Note:** You can use formatting inside blockquotes.
>
> Including multiple paragraphs.

> Nested blockquotes:
> > This is nested
> > > And this is deeper

---

# Tables

| Feature | Status | Priority |
|---------|--------|----------|
| Markdown | ✅ Done | High |
| Syntax highlighting | ✅ Done | High |
| Tables | ✅ Done | Medium |
| Images | 🚧 WIP | Low |

| Left aligned | Center aligned | Right aligned |
|:-------------|:--------------:|--------------:|
| Left | Center | Right |
| A | B | C |

---

# Horizontal Rules

---

***

___

# Mixed Content Example

Here's a complex example combining multiple elements:

1. **Step 1**: Install dependencies
   \`\`\`bash
   npm install
   \`\`\`

2. **Step 2**: Configure the application

   > **Important:** Make sure to set your API keys!

   - [x] Set \`API_KEY\` in environment
   - [ ] Configure database connection

3. **Step 3**: Run the app
   \`\`\`bash
   npm start
   \`\`\`

---

# Escape Characters

You can escape special characters: \\* \\_ \\[ \\] \\( \\) \\# \\+ \\- \\. \\!

---

# Inline HTML (if supported)

<div style="background-color: #f0f0f0; padding: 10px;">
This is HTML content if supported.
</div>

<details>
<summary>Click to expand</summary>

Hidden content here!

</details>

---

That covers most markdown features! 🎉`,
      },
    ],
    text: '',
    model: 'anthropic/claude-sonnet-4-5-20250929',
    usage: { input_tokens: 0, output_tokens: 0 },
    type: 'message',
    timestamp: '2025-10-27T10:00:05.000Z',
    sessionId: 'markdown-test',
  },
] as NormalizedMessage[];

// Message type registry
const messageTypes = {
  tools: {
    messages: multileToolMessages,
    history: ['create b.txt and c.txt with foooooo'],
    description: 'Multiple tool calls with results',
  },
  simple: {
    messages: testMessages,
    history: ['Hello! Can you help me test the UI?'],
    description: 'Simple text conversation',
  },
  markdown: {
    messages: testMarkdownMessages,
    history: ['Show me examples of all markdown formatting'],
    description: 'Comprehensive markdown examples',
  },
} as const;

type MessageType = keyof typeof messageTypes;

function getMessageType(): MessageType {
  const arg = process.argv[2];

  if (!arg) {
    console.log('No message type specified, defaulting to "markdown"');
    console.log('Available types: tools, simple, markdown');
    console.log('Usage: tsx scripts/test-app.ts [type]\n');
    return 'markdown';
  }

  if (arg in messageTypes) {
    return arg as MessageType;
  }

  console.error(`Unknown message type: "${arg}"`);
  console.error('Available types:');
  Object.entries(messageTypes).forEach(([key, value]) => {
    console.error(`  - ${key}: ${value.description}`);
  });
  process.exit(1);
}

async function main() {
  const messageType = getMessageType();
  const { messages, history, description } = messageTypes[messageType];

  console.log(`\nLoading message type: ${messageType}`);
  console.log(`Description: ${description}\n`);

  const appStore = useAppStore.getState();

  // Directly set the store state without using initialize
  // This bypasses the bridge and context setup
  appStore.bridge = null as any; // Mock bridge
  appStore.cwd = process.cwd();
  appStore.productName = 'Takumi Test';
  appStore.productASCIIArt = '🧪 Test Mode';
  appStore.version = '0.0.0-test';
  appStore.model = 'gpt-4o-mini';
  appStore.modelContextLimit = 128000;
  appStore.providers = {};
  appStore.sessionId = 'test-session-123';
  appStore.messages = messages;
  appStore.history = history;
  appStore.logFile = '/tmp/test-session.log';
  appStore.status = 'idle';
  appStore.approvalMode = 'default';

  // Render the app
  render(React.createElement(App), {
    patchConsole: true,
    exitOnCtrlC: true,
  });

  // Exit handler
  const exit = () => {
    process.exit(0);
  };
  process.on('SIGINT', exit);
  process.on('SIGTERM', exit);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
