import * as net from 'net';
import type * as vscode from 'vscode';

export function findFreePort(startPort: number): Promise<number> {
  console.log('[Utils] findFreePort called with startPort:', startPort);
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();

    server.on('error', (error) => {
      console.log(
        '[Utils] findFreePort port',
        startPort,
        'is busy, trying next port. Error:',
        error.message,
      );
      resolve(findFreePort(startPort + 1));
    });

    server.listen(startPort, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      console.log('[Utils] findFreePort found free port:', port);
      server.close(() => {
        console.log(
          '[Utils] findFreePort server closed, resolving with port:',
          port,
        );
        resolve(port);
      });
    });
  });
}

export async function setEnvVariable(
  context: vscode.ExtensionContext,
  key: string,
  value: string,
) {
  console.log('[Utils] setEnvVariable called with key:', key, 'value:', value);

  context.environmentVariableCollection.replace(key, value);
  console.log('[Utils] setEnvVariable replaced successfully');
  console.log(
    `[Utils] Set environment variable for terminals: ${key}=${value}`,
  );
}

export async function clearEnvVariable(
  context: vscode.ExtensionContext,
  key: string,
) {
  console.log('[Utils] clearEnvVariable called with key:', key);

  context.environmentVariableCollection.delete(key);
  console.log('[Utils] clearEnvVariable deleted successfully');
  console.log(`[Utils] Cleared environment variable: ${key}`);
}
