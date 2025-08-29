import { enhanceTool } from '../tool';
import { createBashTool } from '../tools/bash';
import { createEditTool } from '../tools/edit';
import { createFetchTool } from '../tools/fetch';
import { createGlobTool } from '../tools/glob';
import { createGrepTool } from '../tools/grep';
import { createLSTool } from '../tools/ls';
import { createReadTool } from '../tools/read';
import { createTodoTool } from '../tools/todo';
import { createWriteTool } from '../tools/write';
import { Context } from './context';

type ResolveToolsOpts = {
  context: Context;
  sessionId: string;
};

type ToolCategory = 'read' | 'write' | 'network';
type ToolRiskLevel = 'low' | 'medium' | 'high';

// TODO: remove context from here and createXXXTool
export async function resolveTools(opts: ResolveToolsOpts) {
  const context = opts.context as any;
  const sessionId = opts.sessionId;
  const readonlyTools = [
    createReadTool({ context }),
    enhanceTool(
      createLSTool({ cwd: context.cwd, productName: context.productName }),
      {
        category: 'read',
        riskLevel: 'low',
      },
    ),
    enhanceTool(createGlobTool({ context }), {
      category: 'read',
      riskLevel: 'low',
    }),
    enhanceTool(createGrepTool({ context }), {
      category: 'read',
      riskLevel: 'low',
    }),
    enhanceTool(createFetchTool({ context }), {
      category: 'network',
      riskLevel: 'medium',
    }),
  ];
  const writeTools = [
    enhanceTool(createWriteTool({ context }), {
      category: 'write',
      riskLevel: 'medium',
    }),
    enhanceTool(createEditTool({ context }), {
      category: 'write',
      riskLevel: 'medium',
    }),
    createBashTool({ context }),
  ];

  const { todoWriteTool, todoReadTool } = createTodoTool({
    context,
    sessionId,
  });
  const todoTools = context.config.todo ? [todoReadTool, todoWriteTool] : [];

  // TODO: mcp tools

  return [...readonlyTools, ...writeTools, ...todoTools];
}
