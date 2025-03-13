import dotenv from 'dotenv';
import yParser from 'yargs-parser';
import { getSystemPrompt } from './constants/prompts';
import { query } from './query';
import { CoreMessage } from 'ai';
import { getModel } from './model';

async function main() {
  dotenv.config();
  const argv = yParser(process.argv.slice(2));
  console.log(argv);
  let messages: CoreMessage[] = [];
  if (argv._.length > 0) {
    messages = [{ role: 'user', content: argv._[0] as string }];
  }
  // const model = getModel('deepseek-r1-distill-llama-70b');
  // const model = getModel('Doubao/deepseek-chat');
  const model = getModel('Ollama/qwq:32b');
  // const model = getModel('qwen-qwq-32b');
  while (true) {
    const result = await query({
      messages,
      context: {},
      systemPrompt: getSystemPrompt(),
      model,
    });
    let toolCalls: string[] = [];
    for (const step of result.steps) {
      if (step.text.length > 0) {
        messages.push({ role: 'assistant', content: step.text });
      }
      if (step.toolCalls.length > 0) {
        toolCalls.push(...step.toolCalls.map((toolCall) => toolCall.toolName));
        messages.push({ role: 'assistant', content: step.toolCalls });
      }
      if (step.toolResults.length > 0) {
        // TODO: fix this upstream. for some reason, the tool does not include the type,
        // against the spec.
        for (const toolResult of step.toolResults) {
          if (!toolResult.type) {
            toolResult.type = 'tool-result';
          }
        }
        messages.push({ role: 'tool', content: step.toolResults });
      }
    }
    if (toolCalls.length > 0) {
      // console.log(`Tools called: ${toolCalls.join(', ')}`);
    } else {
      console.log(result.text);
      break;
    }
  }
}

main().catch(console.error);
