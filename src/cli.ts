import dotenv from 'dotenv';
import yParser from 'yargs-parser';
import { getSystemPrompt } from './constants/prompts';
import { query } from './query';

async function main() {
  dotenv.config();
  const argv = yParser(process.argv.slice(2));
  console.log(argv);
  const result = await query({
    messages: [{ role: 'user', content: argv._[0] as string }],
    context: {},
    systemPrompt: getSystemPrompt(),
  });
  console.log(result);
}

main().catch(console.error);
