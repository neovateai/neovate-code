import type { MCPConfig } from '../src/mcp';
import { MCPManager, parseMcpConfig } from '../src/mcp';

async function testMCPManager() {
  console.log('=== Testing MCP Manager ===\n');

  // Test 1: Create MCP Manager with config
  console.log('Test 1: Creating MCP Manager...');
  const mcpServers: Record<string, MCPConfig> = {
    'exa-code': {
      url: 'https://mcp.exa.ai/mcp?exaApiKey=dd6f16da-15f5-46ca-8794-6cc29b8b9c44',
      type: 'http',
      timeout: 30000,
    },
    'disabled-server': {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
      disable: true,
    },
  };

  const manager = MCPManager.create(mcpServers);
  console.log('✓ Manager created');
  console.log('  Server names:', manager.getServerNames());
  console.log('  Is ready:', manager.isReady());
  console.log('  Is loading:', manager.isLoading());
  console.log();

  // Test 2: Initialize async
  console.log('Test 2: Initializing servers asynchronously...');
  const startTime = Date.now();
  await manager.initAsync();
  const duration = Date.now() - startTime;
  console.log(`✓ Initialization completed in ${duration}ms`);
  console.log('  Is ready:', manager.isReady());
  console.log('  Is loading:', manager.isLoading());
  console.log();

  // Test 3: Get server status
  console.log('Test 3: Getting server status...');
  const statuses = await manager.getAllServerStatus();
  for (const [name, status] of Object.entries(statuses)) {
    console.log(`  ${name}:`);
    console.log(`    Status: ${status.status}`);
    console.log(`    Tool count: ${status.toolCount}`);
    if (status.error) {
      console.log(`    Error: ${status.error}`);
    }
  }
  console.log();

  // Test 4: Get all tools
  console.log('Test 4: Getting all tools...');
  try {
    const tools = await manager.getAllTools();
    console.log(`✓ Found ${tools.length} tools:`);
    for (const tool of tools) {
      console.log(`  - ${tool.name}`);
      console.log(`    Description: ${tool.description}`);
      if (tool.parameters) {
        const paramNames = Object.keys(tool.parameters.properties || {});
        if (paramNames.length > 0) {
          console.log(`    Parameters: ${paramNames.join(', ')}`);
        }
      }
    }
  } catch (error) {
    console.error('✗ Error getting tools:', error);
  }
  console.log();

  // Test 5: Get tools from specific server
  console.log('Test 5: Getting tools from exa-code server...');
  try {
    const tools = await manager.getTools(['exa-code']);
    console.log(`✓ Found ${tools.length} tools from exa-code`);
  } catch (error) {
    console.error('✗ Error getting tools:', error);
  }
  console.log();

  // Test 6: Test server status checks
  console.log('Test 6: Testing individual server status...');
  const hasExaCode = manager.hasServer('exa-code');
  const exaStatus = manager.getServerStatus('exa-code');
  const exaError = manager.getServerError('exa-code');
  console.log(`  Has exa-code: ${hasExaCode}`);
  console.log(`  exa-code status: ${exaStatus}`);
  if (exaError) {
    console.log(`  exa-code error: ${exaError}`);
  }
  console.log();

  // Test 7: Test tool execution (if tools are available)
  console.log('Test 7: Testing tool execution...');
  try {
    const tools = await manager.getAllTools();
    if (tools.length > 0) {
      const firstTool = tools[0];
      console.log(`  Attempting to execute: ${firstTool.name}`);

      // Try to execute with empty params (some tools might accept this)
      const result = await firstTool.execute({});
      console.log('  ✓ Tool executed successfully');
      console.log('    Return display:', result.returnDisplay);
      if (result.isError) {
        console.log('    Error:', result.llmContent);
      } else {
        console.log('    Result type:', typeof result.llmContent);
        if (typeof result.llmContent === 'string') {
          console.log(
            '    Result preview:',
            result.llmContent.substring(0, 100),
          );
        }
      }
    } else {
      console.log('  No tools available to test');
    }
  } catch (error) {
    console.error(
      '  ✗ Error executing tool:',
      error instanceof Error ? error.message : error,
    );
  }
  console.log();

  // Test 8: Cleanup
  console.log('Test 8: Cleaning up...');
  await manager.destroy();
  console.log('✓ Manager destroyed');
  console.log('  Is ready:', manager.isReady());
  console.log();
}

async function testParseMcpConfig() {
  console.log('=== Testing parseMcpConfig ===\n');

  // Test 1: Parse from JSON string
  console.log('Test 1: Parsing from JSON string...');
  const jsonConfig = JSON.stringify({
    mcpServers: {
      'test-server': {
        command: 'test-command',
        args: ['arg1', 'arg2'],
      },
    },
  });

  try {
    const parsed = parseMcpConfig([jsonConfig], process.cwd());
    console.log('✓ Parsed successfully:');
    console.log('  Servers:', Object.keys(parsed));
    console.log('  test-server config:', parsed['test-server']);
  } catch (error) {
    console.error('✗ Error:', error);
  }
  console.log();
}

async function main() {
  try {
    await testMCPManager();
    await testParseMcpConfig();
    console.log('=== All tests completed ===');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
