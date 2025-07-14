import * as vscode from 'vscode';
import { McpServer } from './mcp-server';
import { memFs } from './tools';
import { setEnvVariable } from './utils';

let mcpServer: McpServer | null = null;
const ENV_VAR_NAME = 'TAKUMI_SSE_PORT';

export function activate(context: vscode.ExtensionContext) {
  console.log('[Extension] Activating takumi extension...');
  console.log('[Extension] Extension context:', {
    extensionPath: context.extensionPath,
    globalStoragePath: context.globalStoragePath,
    subscriptions: context.subscriptions.length,
  });

  console.log('[Extension] Registering memfs file system provider...');
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider('memfs', memFs, {
      isCaseSensitive: true,
    }),
  );
  console.log('[Extension] memfs file system provider registered successfully');

  console.log('[Extension] Registering MCP server start command...');
  let startServerCommand = vscode.commands.registerCommand(
    'simple-mcp-server.start',
    async () => {
      console.log('[Extension] MCP server start command triggered');

      if (mcpServer) {
        const message = `MCP Server is already running on port ${mcpServer.port}`;
        console.log('[Extension] Server already running:', message);
        vscode.window.showInformationMessage(message);
        return;
      }

      console.log('[Extension] Creating new MCP server instance...');
      mcpServer = new McpServer();

      try {
        console.log('[Extension] Starting MCP server...');
        const port = await mcpServer.start();
        console.log(
          '[Extension] MCP server started successfully on port:',
          port,
        );

        console.log(
          '[Extension] Setting environment variable:',
          ENV_VAR_NAME,
          '=',
          port,
        );
        await setEnvVariable(context, ENV_VAR_NAME, String(port));

        const successMessage = `MCP Server started on port ${port}.`;
        console.log('[Extension] Success:', successMessage);
        vscode.window.showInformationMessage(successMessage);
      } catch (error: any) {
        console.error('[Extension] Failed to start MCP server:', error);
        console.error('[Extension] Error stack:', error.stack);

        const errorMessage = `Failed to start MCP Server: ${error.message}`;
        console.log('[Extension] Showing error message:', errorMessage);
        vscode.window.showErrorMessage(errorMessage);

        mcpServer = null;
        console.log('[Extension] Reset mcpServer to null due to error');
      }
    },
  );

  context.subscriptions.push(startServerCommand);
  console.log('[Extension] MCP server start command registered successfully');

  // Auto-start the server when extension activates
  console.log('[Extension] Auto-starting MCP server...');
  vscode.commands.executeCommand('simple-mcp-server.start').then(
    () => {
      console.log('[Extension] Auto-start command executed');
    },
    (error: any) => {
      console.error('[Extension] Auto-start failed:', error);
    },
  );

  console.log('[Extension] Extension activation completed');
}

export function deactivate() {
  console.log('[Extension] Deactivating extension...');

  if (mcpServer) {
    console.log('[Extension] Disposing MCP server...');
    mcpServer.dispose();
    mcpServer = null;
    console.log('[Extension] MCP server disposed successfully');
  } else {
    console.log('[Extension] No MCP server to dispose');
  }

  console.log('[Extension] Extension deactivation completed');
}
