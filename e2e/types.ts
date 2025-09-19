export type TaskModule = {
  test: (opts: {
    jsonl: any[];
    assistantMessages: any[];
    result: string;
    isError: boolean;
  }) => void;
  cliArgs: string;
};
