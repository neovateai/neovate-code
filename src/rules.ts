import fs from 'fs';
import path from 'pathe';

export function getLlmsRules(opts: {
  cwd: string;
  productName: string;
  globalConfigDir: string;
}) {
  const rules: string[] = [];
  const productName = opts.productName;

  const globalRuleNames = ['AGENTS.md', `${productName.toUpperCase()}.md`];
  const projectRuleNames = [
    'AGENTS.md',
    'CLAUDE.md',
    `${productName.toUpperCase()}.md`,
  ];

  // 1. project rules
  let currentDir = opts.cwd;
  while (currentDir !== path.parse(currentDir).root) {
    for (const ruleName of projectRuleNames) {
      const stylePath = path.join(currentDir, ruleName);
      if (fs.existsSync(stylePath)) {
        rules.push(fs.readFileSync(stylePath, 'utf-8'));
      }
    }
    currentDir = path.dirname(currentDir);
  }
  // 2. global rules
  for (const ruleName of globalRuleNames) {
    const globalStylePath = path.join(opts.globalConfigDir, ruleName);
    if (fs.existsSync(globalStylePath)) {
      rules.push(fs.readFileSync(globalStylePath, 'utf-8'));
    }
  }
  const globalClaudeRulePath = path.join(
    opts.globalConfigDir,
    '../.claude/CLAUDE.md',
  );
  if (fs.existsSync(globalClaudeRulePath)) {
    rules.push(fs.readFileSync(globalClaudeRulePath, 'utf-8'));
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
