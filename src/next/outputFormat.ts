import type { EnhancedTool } from '../tool';
import type { LoopResult, ToolUse } from './loop';
import type { ModelInfo } from './model';

type Format = 'text' | 'stream-json' | 'json';

type OutputFormatOpts = {
  format: Format;
  quiet: boolean;
};

export class OutputFormat {
  format: Format;
  quiet: boolean;
  dataArr: any[];
  constructor(opts: OutputFormatOpts) {
    this.format = opts.format;
    this.quiet = opts.quiet;
    this.dataArr = [];
  }
  onInit(opts: {
    text: string;
    sessionId: string;
    cwd: string;
    tools: EnhancedTool[];
    model: ModelInfo;
  }) {
    if (!this.quiet) {
      return;
    }
    const data = {
      type: 'system',
      subtype: 'init',
      session_id: opts.sessionId,
      model: opts.model.model.id,
      cwd: opts.cwd,
      tools: opts.tools.map((tool) => tool.name),
    };
    if (this.format === 'stream-json') {
      console.log(JSON.stringify(data));
    } else if (this.format === 'json') {
      this.dataArr.push(data);
    }
  }
  onText(opts: { text: string; sessionId: string }) {
    if (!this.quiet) {
      return;
    }
    const data = {
      type: 'assistant',
      message: {
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: opts.text,
          },
        ],
      },
      session_id: opts.sessionId,
    };
    if (this.format === 'stream-json') {
      console.log(JSON.stringify(data));
    } else if (this.format === 'json') {
      this.dataArr.push(data);
    }
  }
  onToolUse(opts: { toolUse: ToolUse; sessionId: string }) {
    if (!this.quiet) {
      return;
    }
    const data = {
      type: 'assistant',
      message: {
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: opts.toolUse.callId,
            name: opts.toolUse.name,
            input: opts.toolUse.params,
          },
        ],
      },
      session_id: opts.sessionId,
    };
    if (this.format === 'stream-json') {
      console.log(JSON.stringify(data));
    } else if (this.format === 'json') {
      this.dataArr.push(data);
    }
  }
  onToolUseResult(opts: { toolUse: ToolUse; result: any; sessionId: string }) {
    if (!this.quiet) {
      return;
    }
    const data = {
      type: 'user',
      message: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: opts.toolUse.callId,
            content: opts.result,
          },
        ],
      },
      session_id: opts.sessionId,
    };
    if (this.format === 'stream-json') {
      console.log(JSON.stringify(data));
    } else if (this.format === 'json') {
      this.dataArr.push(data);
    }
  }
  onEnd(opts: { result: LoopResult; sessionId: string }) {
    if (!this.quiet) {
      return;
    }
    const data: any = {
      type: 'result',
      subtype: opts.result.success ? 'success' : 'error',
      is_error: !opts.result.success,
      content: opts.result.success
        ? opts.result.data.text
        : opts.result.error.message,
      session_id: opts.sessionId,
    };
    if (opts.result.success) {
      data.usage = {
        input_tokens: opts.result.data.usage.promptTokens,
        output_tokens: opts.result.data.usage.completionTokens,
      };
    }
    if (this.format === 'stream-json') {
      console.log(JSON.stringify(data));
    } else if (this.format === 'json') {
      this.dataArr.push(data);
      console.log(JSON.stringify(this.dataArr));
    } else if (this.format === 'text') {
      console.log(
        opts.result.success
          ? opts.result.data?.text || ''
          : opts.result.error.message,
      );
    }
  }
}
