import fs from 'fs';
import path from 'path';

export function getLlmsRules(opts: {
  cwd: string;
  productName: string;
  globalConfigDir: string;
}) {
  const rules: string[] = [];
  const productName = opts.productName;

  // 1. project rules
  let currentDir = opts.cwd;
  while (currentDir !== path.parse(currentDir).root) {
    const stylePath = path.join(currentDir, `${productName}.md`);
    if (fs.existsSync(stylePath)) {
      rules.push(fs.readFileSync(stylePath, 'utf-8'));
    }
    currentDir = path.dirname(currentDir);
  }
  // 2. global rules
  const globalStylePath = path.join(opts.globalConfigDir, `${productName}.md`);
  if (fs.existsSync(globalStylePath)) {
    rules.push(fs.readFileSync(globalStylePath, 'utf-8'));
  }

  if (rules.length === 0) {
    return null;
  }
  const reversedRules = rules.reverse();
  return {
    rules: reversedRules.join('\n\n'),
    llmsDescription: `
    The codebase follows strict style guidelines shown below. All code changes must strictly adhere to these guidelines to maintain consistency and quality.
  
    ${reversedRules.join('\n\n')}`,
  };
}
