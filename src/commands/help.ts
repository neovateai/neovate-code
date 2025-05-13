import { MODEL_ALIAS } from '../llms/model';

export async function runHelp(opts: { productName: string }) {
  const modelAliases = MODEL_ALIAS;
  const productName = opts.productName.toLowerCase();

  console.log(
    `
Usage:
  $ ${productName} [command] [prompt_or_args] [options]

Commands:
  <prompt>             Instruct ${productName.toUpperCase()} to perform actions based on the prompt (default command).
  ask <prompt>         Ask questions about the codebase or programming concepts.
  commit               Generate a conventional commit message based on staged changes.
  init                 Analyze the project and generate/update a ${productName.toUpperCase()}.md guidelines file.
  test                 Run project tests and optionally fix failures automatically.
  watch                Monitor files for changes and execute AI instructions found in comments (e.g., // AI! <instruction>).
  version              Display the version number.
  help                 Show this help message.
  run <prompt>         Run a command based on the prompt.

General Options:
  -a, --approval-mode <approval-mode> Specify the approval mode for tool execution(defaults to 'suggest').
  -m, --model <model>  Specify the language model to use.
  --small-model <model> Specify a smaller language model for certain tasks.
  --api-key <provider=key> Specify the API key for a provider (e.g., OPENAI=sk-...).
  --stream             Stream the response from the LLM.
  --mcp <server>       Specify extra MCP (Multi-Agent Collaboration Protocol) servers to use.
  -q, --quiet          Enable non-interactive quiet mode (suppress confirmation prompts).
  --language <lang>    Specify the language for the output (defaults to 'en').
  --codebase <includes> Specify codebase paths to include in context.
  -h, --help           Show this help message.
  -v, --version        Show version number.

Default Command Options:
  --plan               Generate a step-by-step plan before execution and ask for confirmation.
  --plan-model <model> Specify a different model for the planning phase (defaults to --model).

'commit' Command Options:
  --stage              Run 'git add .' before generating the message.
  --commit             Run 'git commit -m "<message>"' after generating.
  --push               Run 'git push' after committing (requires --commit).
  --copy               Copy the generated commit message to the clipboard.
  --follow-style       Analyze recent commits and instruct AI to follow a similar style.
  --no-verify          Pass '--no-verify' to 'git commit' (requires --commit).
  -i, --interactive    Enable interactive mode for selecting actions after message generation.

'test' Command Options:
  --test-cmd <cmd>     Specify a custom command to run tests (default: 'npm run test').

'run' Command Options:
  --yes                Automatically confirm the execution of the generated command.
  --dry-run            Display the generated command without executing it.

Model Aliases:
${Object.entries(modelAliases)
  .map(([alias, model]) => `  ${alias}: ${model}`)
  .join('\n')}

Examples:
  ${productName} "Implement a function to calculate factorial in src/mathUtils.ts"
  ${productName} "Refactor the database logic in src/db.ts" --plan -m gemini-pro
  ${productName} ask "Where are environment variables configured?"
  ${productName} commit --stage --commit --push
  ${productName} commit --copy
  ${productName} commit -i
  ${productName} init -m gemini-pro
  ${productName} test --test-cmd "vitest run tests/specific.test.ts"
  ${productName} watch
  ${productName} run "Create a new file in the src/utils directory"
`.trimEnd(),
  );
}
