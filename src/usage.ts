import type { AssistantMessage } from './message';

export class Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;

  constructor(init?: Partial<Usage>) {
    this.promptTokens = init?.promptTokens ?? 0;
    this.completionTokens = init?.completionTokens ?? 0;
    this.totalTokens = init?.totalTokens ?? 0;
  }

  static empty(): Usage {
    return new Usage();
  }

  static fromEventUsage(eventUsage: any): Usage {
    const promptTokens =
      eventUsage?.promptTokens ?? eventUsage?.inputTokens ?? 0;
    const completionTokens =
      eventUsage?.completionTokens ?? eventUsage?.outputTokens ?? 0;
    const totalTokens =
      eventUsage?.totalTokens ?? promptTokens + completionTokens;

    return new Usage({
      promptTokens: Number.isNaN(promptTokens) ? 0 : promptTokens,
      completionTokens: Number.isNaN(completionTokens) ? 0 : completionTokens,
      totalTokens: Number.isNaN(totalTokens) ? 0 : totalTokens,
    });
  }

  static fromAssistantMessage(message: AssistantMessage): Usage {
    return new Usage({
      promptTokens: message.usage?.input_tokens,
      completionTokens: message.usage?.output_tokens,
      totalTokens: message.usage?.input_tokens + message.usage?.output_tokens,
    });
  }

  add(other: Usage): void {
    this.promptTokens += other.promptTokens;
    this.completionTokens += other.completionTokens;
    this.totalTokens += other.totalTokens;
  }

  reset(): void {
    this.promptTokens = 0;
    this.completionTokens = 0;
    this.totalTokens = 0;
  }

  clone(): Usage {
    return new Usage({
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalTokens: this.totalTokens,
    });
  }

  isValid(): boolean {
    return (
      this.promptTokens >= 0 &&
      this.completionTokens >= 0 &&
      this.totalTokens >= 0
    );
  }
}
