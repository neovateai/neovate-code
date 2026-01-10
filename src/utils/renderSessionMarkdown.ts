import type {
  AssistantContent,
  NormalizedMessage,
  TextPart,
  ToolContent,
  ToolResultPart2,
  UserContent,
} from '../message';

export function renderSessionMarkdown(opts: {
  sessionId: string;
  title: string;
  projectPath: string;
  model: string | null;
  messages: NormalizedMessage[];
  createdAt: Date;
  updatedAt: Date;
}): string {
  const lines: string[] = [];

  const title = normalizeTitle(opts.title) || `Session ${opts.sessionId}`;

  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`**Session ID:** ${opts.sessionId}`);
  lines.push(`**Project:** ${opts.projectPath}`);
  lines.push(`**Model:** ${opts.model ?? ''}`);
  lines.push(`**Created:** ${formatDate(opts.createdAt)}`);
  lines.push(`**Updated:** ${formatDate(opts.updatedAt)}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  opts.messages.forEach((m) => {
    if (m.role === 'system') return;

    const header = (() => {
      if (m.role === 'user') return '## User';
      if (m.role === 'tool') return '## Tool';
      if (m.role === 'assistant') {
        return '## Assistant';
      }
      return '## Message';
    })();

    if (header) {
      lines.push(header);
      lines.push('');
    }

    if (m.role === 'tool') {
      const toolContent = m.content as ToolResultPart2[];
      for (const part of toolContent) {
        lines.push(`Tool: ${part.toolName}`);
        const toolModel = getModelFromToolResultPart(part);
        if (toolModel && shouldShowModel(toolModel, opts.model)) {
          lines.push('');
          lines.push(`**Model:** ${toolModel}`);
        }
        lines.push('');
        lines.push('**Input:**');
        lines.push('```json');
        lines.push(JSON.stringify(part.input ?? {}, null, 2));
        lines.push('```');
        lines.push('');
        lines.push('**Output:**');
        lines.push('```');
        lines.push(renderToolResultOutput(part.result.llmContent));
        lines.push('```');
        lines.push('');
      }
      return;
    }

    const content = renderMessageContent(m.content);
    if (content) lines.push(content);
    lines.push('');
  });

  return lines.join('\n');
}

function renderMessageContent(
  content: UserContent | AssistantContent | ToolContent | ToolResultPart2[],
): string {
  if (typeof content === 'string') return content;

  return content
    .map((part) => {
      if (!('type' in part)) return String(part);

      if (part.type === 'text') return (part as TextPart).text;

      if (part.type === 'reasoning') {
        return `_Thinking:_

${part.text}`;
      }

      if (part.type === 'tool_use') {
        return `Tool: ${part.name}

**Input:**

\`\`\`json
${JSON.stringify(part.input ?? {}, null, 2)}
\`\`\`

**Output:**`;
      }

      if (part.type === 'tool_result') {
        const result = part.result;
        return `

\`\`\`
${renderToolResultOutput(result.llmContent)}
\`\`\`
`;
      }

      return `\n\`\`\`\n[${part.type}]\n\`\`\`\n`;
    })
    .join('\n');
}

function renderToolResultOutput(
  output: TextPart['text'] | Array<TextPart | { type: 'image' }>,
): string {
  if (typeof output === 'string') return output;
  return output
    .filter((p): p is TextPart => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

function normalizeTitle(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\r\n|\r|\n/)[0]
    .slice(0, 80)
    .trim();
}

function formatDate(date: Date): string {
  return date.toLocaleString();
}

function getModelFromToolResultPart(part: ToolResultPart2): string | null {
  if (part.toolName !== 'task') return null;

  const returnDisplay = part.result.returnDisplay;
  if (!returnDisplay) return null;
  if (typeof returnDisplay !== 'object') return null;
  if (!('type' in returnDisplay)) return null;
  if (returnDisplay.type !== 'agent_result') return null;
  if (!('model' in returnDisplay)) return null;

  const model = returnDisplay.model;
  return typeof model === 'string' ? model : null;
}

function shouldShowModel(model: string, mainModel: string | null): boolean {
  if (!model) return false;
  if (!mainModel) return true;

  if (mainModel === model) return false;

  const parts = mainModel.split('/');
  if (parts.length >= 2) {
    const id = parts.slice(1).join('/');
    if (id === model) return false;
  }

  return true;
}
