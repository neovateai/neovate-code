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
  messages: NormalizedMessage[];
}): string {
  const exportedAt = new Date().toISOString();
  const lines: string[] = [];

  lines.push(`# Session ${opts.sessionId}`);
  lines.push('');
  lines.push(`- ExportedAt: ${exportedAt}`);
  lines.push(`- MessageCount: ${opts.messages.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Messages');
  lines.push('');

  opts.messages.forEach((m, i) => {
    lines.push(`### ${i + 1}. ${m.role}`);
    lines.push('');

    const content = renderMessageContent(m.content);

    lines.push(content);
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
      if ('type' in part) {
        if (part.type === 'text') return (part as TextPart).text;
        if (part.type === 'tool-result') {
          const llmContent = part.result.llmContent;
          const resultText =
            typeof llmContent === 'string'
              ? llmContent
              : llmContent
                  .filter((p): p is TextPart => p.type === 'text')
                  .map((p) => p.text)
                  .join('');
          return `\n[tool-result] ${part.toolName}\n\`\`\`\n${resultText}\n\`\`\`\n`;
        }
        if (part.type === 'tool_use') {
          const input = JSON.stringify(part.input ?? {}, null, 2);
          return `\n[tool_use] ${part.name}\n\`\`\`json\n${input}\n\`\`\`\n`;
        }
        return `\n\`\`\`\n[${part.type}]\n\`\`\`\n`;
      }
      return String(part);
    })
    .join('\n');
}
