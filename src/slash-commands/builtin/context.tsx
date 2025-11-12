import type { Context } from '../../context';
import { LlmsContext } from '../../llmsContext';
import type { LocalCommand } from '../types';

class ContextCommand implements LocalCommand {
  name = 'context';
  description = 'Display current model context information';
  type = 'local' as const;

  async call(_args: string, context: Context): Promise<string> {
    try {
      const llmsContext = await LlmsContext.create({
        context,
        sessionId: 'context-command',
        userPrompt: null,
      });

      return this.formatContext(llmsContext);
    } catch (error) {
      return `Error loading context: ${error}`;
    }
  }

  private formatContext(llmsContext: LlmsContext): string {
    const messages = llmsContext.messages;
    if (messages.length === 0) {
      return 'No context information available.';
    }

    let output = '=== Context Information ===\n\n';

    for (const message of messages) {
      const contextMatch = message.match(
        /<context name="([^"]+)">([^<]+)<\/context>/g,
      );
      const envMatch = message.match(/<env name="([^"]+)">([^<]+)<\/env>/g);

      if (contextMatch) {
        output += '📋 Context Data:\n';
        for (const match of contextMatch) {
          const [, name, value] =
            match.match(/<context name="([^"]+)">([^<]+)<\/context>/) || [];
          if (name && value) {
            output += this.formatContextSection(name, value);
          }
        }
        output += '\n';
      }

      if (envMatch) {
        output += '🔧 Environment:\n';
        for (const match of envMatch) {
          const [, name, value] =
            match.match(/<env name="([^"]+)">([^<]+)<\/env>/) || [];
          if (name && value) {
            output += `  ${name}: ${value}\n`;
          }
        }
      }
    }

    output += '\n=== End Context ===';
    return output;
  }

  private formatContextSection(name: string, value: string): string {
    const truncatedValue = this.truncateForDisplay(value, 500);

    switch (name) {
      case 'gitStatus':
        return `  📊 Git Status:\n${this.indentLines(truncatedValue, 4)}\n`;
      case 'directoryStructure':
        return `  📁 Directory Structure:\n${this.indentLines(truncatedValue, 4)}\n`;
      case 'rules':
        return `  📖 Rules:\n${this.indentLines(truncatedValue, 4)}\n`;
      case 'readme':
        return `  📄 README:\n${this.indentLines(truncatedValue, 4)}\n`;
      default:
        return `  ${name}:\n${this.indentLines(truncatedValue, 4)}\n`;
    }
  }

  private truncateForDisplay(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  private indentLines(text: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return text
      .split('\n')
      .map((line) => (line.trim() ? `${indent}${line}` : line))
      .join('\n');
  }
}

const contextCommand: LocalCommand = new ContextCommand();
export default contextCommand;
