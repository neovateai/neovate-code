interface UsageData {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  usageDetail: Record<string, any>;
}

export class Usage {
  /**
   * The number of requests made to the LLM API.
   */
  public requests: number;

  /**
   * The number of input tokens used across all requests.
   */
  public inputTokens: number;

  /**
   * The number of output tokens used across all requests.
   */
  public outputTokens: number;

  /**
   * The total number of tokens sent and received, across all requests.
   */
  public totalTokens: number;

  public usageDetails: Array<Record<string, any>> = [];

  constructor(input?: Partial<UsageData> & { requests?: number }) {
    if (typeof input === 'undefined') {
      this.requests = 0;
      this.inputTokens = 0;
      this.outputTokens = 0;
      this.totalTokens = 0;
      this.usageDetails = [];
    } else {
      this.requests = input?.requests ?? 1;
      this.inputTokens = input?.inputTokens ?? 0;
      this.outputTokens = input?.outputTokens ?? 0;
      this.totalTokens = input?.totalTokens ?? 0;
      this.usageDetails = input?.usageDetail ? [input.usageDetail] : [];
    }
  }

  add(newUsage: Usage) {
    this.requests += newUsage.requests ?? 1;
    this.inputTokens += newUsage.inputTokens ?? 0;
    this.outputTokens += newUsage.outputTokens ?? 0;
    this.totalTokens += newUsage.totalTokens ?? 0;
    if (newUsage.usageDetails) {
      this.usageDetails.push(...newUsage.usageDetails);
    }
  }

  clear() {
    this.requests = 0;
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.totalTokens = 0;
    this.usageDetails = [];
  }

  toJSON() {
    return {
      requests: this.requests,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.totalTokens,
      usageDetails: this.usageDetails,
    };
  }
}
