import { tool } from 'ai';
import { z } from 'zod';

export const BatchTool = tool({
  description: `Batch execution tool that runs multiple tool invocations in a single request.
  - Tools are executed in parallel when possible, and otherwise serially
  - Takes a list of tool invocations (tool_name and input pairs)
  - Returns the collected results from all invocations
  - Use this tool when you need to run multiple independent tool operations at once -- it is awesome for speeding up your workflow, reducing both context usage and latency
  - Each tool will respect its own permissions and validation rules
  - The tool's outputs are NOT shown to the user; to answer the user's query, you MUST send a message with the results after the tool call completes, otherwise the user will not see the results`,

  parameters: z.strictObject({
    description: z
      .string()
      .describe('A short (3-5 word) description of the batch operation'),
    invocations: z
      .array(
        z.object({
          tool_name: z.string().describe('The name of the tool to invoke'),
          input: z.record(z.any()).describe('The input to pass to the tool'),
        }),
      )
      .describe('The list of tool invocations to execute'),
  }),

  execute: async ({ description, invocations }, context: any) => {
    // Access tools from the context with type assertion
    const tools = (context as any)?.tools || {};

    // Track results and errors
    const results = [];
    const startTime = Date.now();
    let hasErrors = false;

    // Process each invocation
    for (const invocation of invocations) {
      try {
        const { tool_name, input } = invocation;
        const invocationKey = `${tool_name}(${Object.entries(input)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join(', ')})`;

        // Check if the tool exists
        if (!tools[tool_name]) {
          results.push({
            key: invocationKey,
            result: `Error: No such tool available: ${tool_name}`,
            is_error: true,
          });
          hasErrors = true;
          continue;
        }

        // Call the tool
        const toolFn = tools[tool_name].execute;
        if (!toolFn) {
          results.push({
            key: invocationKey,
            result: `Error: Tool ${tool_name} has no execute method`,
            is_error: true,
          });
          hasErrors = true;
          continue;
        }

        // Execute the tool with a timeout
        const timeout = 60000; // 1 minute timeout
        const toolPromise = toolFn(input, context);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                `Tool ${tool_name} execution timed out after ${timeout}ms`,
              ),
            );
          }, timeout);
        });

        const result = await Promise.race([toolPromise, timeoutPromise]);

        results.push({
          key: invocationKey,
          result,
          is_error: false,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        results.push({
          key: `${invocation.tool_name}(${Object.entries(invocation.input)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join(', ')})`,
          result: `Error: ${errorMessage}`,
          is_error: true,
        });
        hasErrors = true;
      }
    }

    // Calculate execution time
    const totalDuration = Date.now() - startTime;

    // Format and return results
    const formattedResults = results
      .map(
        ({ key, result, is_error }) =>
          `${key}: ${is_error ? '❌ ' : '✅ '} ${typeof result === 'object' ? JSON.stringify(result) : result}`,
      )
      .join('\n\n');

    return `Batch operation "${description}" completed in ${totalDuration}ms.\n\n${formattedResults}`;
  },
});
