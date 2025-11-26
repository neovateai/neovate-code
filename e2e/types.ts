export type TaskModule = {
  test: (opts: {
    jsonl: any[];
    assistantMessages: any[];
    result: string;
    isError: boolean;
    cwd: string;
  }) => void;
  cliArgs: string[];
  model?: string;
};
