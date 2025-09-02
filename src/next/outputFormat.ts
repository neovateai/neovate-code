import type { LoopResult } from './loop';
import type { ModelInfo } from './model';
import type { Tool } from './tool';

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
    tools: Tool[];
    model: ModelInfo;
  }) {
    if (!this.quiet) {
      return;
    }
    const model = `${opts.model.provider.id}/${opts.model.model.id}`;
    const data = {
      type: 'system',
      subtype: 'init',
      sessionId: opts.sessionId,
      model,
      cwd: opts.cwd,
      tools: opts.tools.map((tool) => tool.name),
    };
    if (this.format === 'stream-json') {
      console.log(JSON.stringify(data));
    } else if (this.format === 'json') {
      this.dataArr.push(data);
    }
  }
  onMessage(opts: { message: any }) {
    if (!this.quiet) {
      return;
    }
    const data = { ...opts.message };
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
    const isError = !opts.result.success;
    const subtype = isError ? 'error' : 'success';
    const data: any = {
      type: 'result',
      subtype,
      isError,
      content: opts.result.success
        ? opts.result.data.text
        : opts.result.error.message,
      sessionId: opts.sessionId,
      ...(isError ? { __result: opts.result } : {}),
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
