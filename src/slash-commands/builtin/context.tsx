import type { Context } from '../../context';
import { LlmsContext } from '../../llmsContext';
import type { LocalCommand } from '../types';

// 定义类型接口
interface ParsedContext {
  name: string;
  value: string;
  type: ContextType;
}

interface ParsedEnv {
  name: string;
  value: string;
}

enum ContextType {
  GIT_STATUS = 'gitStatus',
  DIRECTORY_STRUCTURE = 'directoryStructure',
  RULES = 'rules',
  README = 'readme',
  OTHER = 'other'
}

class OptimizedContextCommand implements LocalCommand {
  name = 'context';
  description = 'Display current model context information';
  type = 'local' as const;

  // 预编译正则表达式<sup>1</sup>
  private static readonly CONTEXT_REGEX = /<context name="([^"]+)">([\s\S]*?)<\/context>/g;
  private static readonly ENV_REGEX = /<env name="([^"]+)">([\s\S]*?)<\/env>/g;
  
  // 配置常量
  private static readonly MAX_DISPLAY_LENGTH = 500;
  private static readonly INDENT_SPACES = 4;

  async call(_args: string, context: Context): Promise<string> {
    // 添加输入验证
    if (!context) {
      return 'Error: Context parameter is required';
    }

    try {
      const llmsContext = await LlmsContext.create({
        context,
        sessionId: 'context-command',
        userPrompt: null,
      });

      return this.formatContext(llmsContext);
    } catch (error) {
      // 增强错误处理
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Context command error:', error);
      return `Error loading context: ${errorMessage}`;
    }
  }

  private formatContext(llmsContext: LlmsContext): string {
    const messages = llmsContext.messages;
    if (!messages || messages.length === 0) {
      return 'No context information available.';
    }

    const { contexts, envs } = this.parseMessages(messages);
    
    if (contexts.length === 0 && envs.length === 0) {
      return 'No context or environment data found in messages.';
    }

    return this.buildOutput(contexts, envs);
  }

  private parseMessages(messages: string[]): { contexts: ParsedContext[]; envs: ParsedEnv[] } {
    const contexts: ParsedContext[] = [];
    const envs: ParsedEnv[] = [];

    for (const message of messages) {
      // 解析上下文数据
      const contextMatches = this.findAllMatches(OptimizedContextCommand.CONTEXT_REGEX, message);
      for (const match of contextMatches) {
        contexts.push({
          name: match[1],
          value: match[2],
          type: this.determineContextType(match[1])
        });
      }

      // 解析环境变量
      const envMatches = this.findAllMatches(OptimizedContextCommand.ENV_REGEX, message);
      for (const match of envMatches) {
        envs.push({
          name: match[1],
          value: match[2]
        });
      }
    }

    return { contexts, envs };
  }

  private findAllMatches(regex: RegExp, text: string): RegExpExecArray[] {
    const matches: RegExpExecArray[] = [];
    let match: RegExpExecArray | null;
    
    // 重置正则表达式状态
    const localRegex = new RegExp(regex.source, regex.flags);
    
    while ((match = localRegex.exec(text)) !== null) {
      matches.push(match);
    }
    
    return matches;
  }

  private determineContextType(name: string): ContextType {
    const typeMap: Record<string, ContextType> = {
      'gitStatus': ContextType.GIT_STATUS,
      'directoryStructure': ContextType.DIRECTORY_STRUCTURE,
      'rules': ContextType.RULES,
      'readme': ContextType.README
    };

    return typeMap[name] || ContextType.OTHER;
  }

  private buildOutput(contexts: ParsedContext[], envs: ParsedEnv[]): string {
    let output = '=== Context Information ===\n\n';

    if (contexts.length > 0) {
      output += '📋 Context Data:\n';
      for (const context of contexts) {
        output += this.formatContextSection(context);
      }
      output += '\n';
    }

    if (envs.length > 0) {
      output += '🔧 Environment:\n';
      for (const env of envs) {
        output += `  ${env.name}: ${env.value}\n`;
      }
    }

    output += '\n=== End Context ===';
    return output;
  }

  private formatContextSection(context: ParsedContext): string {
    const truncatedValue = this.truncateForDisplay(
      context.value, 
      OptimizedContextCommand.MAX_DISPLAY_LENGTH
    );

    const iconMap: Record<ContextType, string> = {
      [ContextType.GIT_STATUS]: '📊',
      [ContextType.DIRECTORY_STRUCTURE]: '📁',
      [ContextType.RULES]: '📖',
      [ContextType.README]: '📄',
      [ContextType.OTHER]: '🔹'
    };

    const icon = iconMap[context.type];
    const displayName = this.capitalizeFirstLetter(context.name);

    return `  ${icon} ${displayName}:\n${this.indentLines(truncatedValue, OptimizedContextCommand.INDENT_SPACES)}\n`;
  }

  private capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private truncateForDisplay(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '... [truncated]';
  }

  private indentLines(text: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return text
      .split('\n')
      .map((line) => (line.trim() ? `${indent}${line}` : ''))
      .filter(line => line !== '')
      .join('\n');
  }
}

const optimizedContextCommand: LocalCommand = new OptimizedContextCommand();
export default optimizedContextCommand;