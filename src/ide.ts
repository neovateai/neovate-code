import createDebug from 'debug';
import path from 'pathe';
import { fileURLToPath, resolve } from 'url';
import WebSocket from 'ws';
import {
  attemptInstallation,
  type InstallationResult,
  isExtensionInstalled,
  type PlatformInfo,
} from './utils/ide';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '../');

const VSIX_PATH = path.resolve(__dirname, 'vendor', 'takumi.vsix');

// Response type interfaces
interface BaseResponse {
  success: boolean;
  message?: string;
}

interface OpenFileResponse extends BaseResponse {
  filePath?: string;
}

interface OpenDiffResponse extends BaseResponse {
  message: string;
}

interface DiagnosticItem {
  message: string;
  severity: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

interface DiagnosticsResponse {
  diagnostics: Array<{
    uri: string;
    diagnostics: DiagnosticItem[];
  }>;
}

interface EditorInfo {
  filePath: string;
  isActive: boolean;
}

interface OpenEditorsResponse {
  editors: EditorInfo[];
}

interface WorkspaceFolder {
  name: string;
  uri: string;
}

interface WorkspaceFoldersResponse {
  folders: WorkspaceFolder[];
}

export interface SelectionInfo {
  filePath: string;
  text: string;
  selection: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface SelectionResponse extends SelectionInfo {}

export interface SelectionErrorResponse {
  error: string;
}

interface CloseTabResponse extends BaseResponse {
  message: string;
}

interface CloseAllDiffTabsResponse extends BaseResponse {
  closedCount: number;
}

export type SelectionResult = SelectionResponse | SelectionErrorResponse;

// WebSocket message types
interface WSMessage {
  id?: number;
  error?: { message: string };
  result?: unknown;
}

const debug = createDebug('neovate:ide');

export class IDE {
  ws: WebSocket | null;
  private requestId: number;
  private pendingRequests: Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  >;

  constructor() {
    this.ws = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }

  // 发现端口
  async findPort() {
    const envPort = process.env.TAKUMI_SSE_PORT;
    if (envPort) return parseInt(envPort);
  }

  // 连接到 extension
  async connect() {
    debug('Connecting to the IDE extension.');
    const port = await this.findPort();
    debug('Found port: %s', port);
    if (!port) {
      throw new Error('Could not find the IDE extension port');
    }

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(`ws://127.0.0.1:${port}`);

      this.ws.on('open', () => {
        debug('Connected to the IDE extension.');
        resolve();
      });

      this.ws.on('message', (data) => {
        debug('Received message from the IDE extension.', data.toString());
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      });

      this.ws.on('close', () => {
        debug('Disconnected from the IDE extension.');
        this.ws = null;
      });

      this.ws.on('error', reject);
    });
  }

  async disconnect() {
    debug('Disconnecting from IDE extension');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // Clear any pending requests
    this.pendingRequests.clear();
  }

  // 处理消息
  handleMessage(message: WSMessage) {
    debug('Handling message:', message);
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        debug('Request failed:', message.error);
        reject(new Error(message.error.message));
      } else {
        debug('Request succeeded:', message.result);
        resolve(message.result);
      }
    } else {
      debug('Received message without matching request ID:', message);
    }
  }

  // 发送请求
  async request(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<unknown> {
    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const message = {
        id,
        method,
        params,
      };

      debug('Sending request:', message);

      // Check WebSocket connection status
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        debug('WebSocket is not open, readyState:', this.ws?.readyState);
        this.pendingRequests.delete(id);
        return;
      }

      this.ws.send(JSON.stringify(message));

      // 超时处理
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  // 工具方法封装
  async openFile(
    filePath: string,
    options: { preview?: boolean } = {},
  ): Promise<OpenFileResponse> {
    debug('Opening file:', filePath);
    return this.request('openFile', {
      filePath,
      preview: options.preview || false,
    }) as unknown as OpenFileResponse;
  }

  async openDiff(
    old_file_path: string,
    new_file_path: string,
    new_file_contents: string,
    tab_name: string,
  ): Promise<OpenDiffResponse> {
    debug('Opening diff:', { old_file_path, new_file_path, tab_name });
    return this.request('openDiff', {
      old_file_path,
      new_file_path,
      new_file_contents,
      tab_name,
    }) as unknown as OpenDiffResponse;
  }

  async getWorkspaceFolders(): Promise<WorkspaceFoldersResponse> {
    debug('Getting workspace folders');
    return this.request(
      'getWorkspaceFolders',
      {},
    ) as unknown as WorkspaceFoldersResponse;
  }

  async getOpenEditors(): Promise<OpenEditorsResponse> {
    debug('Getting open editors');
    return this.request('getOpenEditors', {}) as unknown as OpenEditorsResponse;
  }

  async getDiagnostics(): Promise<DiagnosticsResponse> {
    debug('Getting diagnostics');
    return this.request('getDiagnostics', {}) as unknown as DiagnosticsResponse;
  }

  async getCurrentSelection(): Promise<SelectionResult> {
    debug('Getting current selection');
    return this.request(
      'getCurrentSelection',
      {},
    ) as unknown as SelectionResult;
  }

  async getLatestSelection(): Promise<SelectionResult> {
    debug('Getting latest selection');
    return this.request('getLatestSelection', {}) as unknown as SelectionResult;
  }

  async closeTab(tab_name: string): Promise<CloseTabResponse> {
    debug('Closing tab:', tab_name);
    return this.request('close_tab', {
      tab_name,
    }) as unknown as CloseTabResponse;
  }

  async closeAllDiffTabs(): Promise<CloseAllDiffTabsResponse> {
    debug('Closing all diff tabs');
    return this.request(
      'closeAllDiffTabs',
      {},
    ) as unknown as CloseAllDiffTabsResponse;
  }

  async setupIDEIntegration(
    terminal: string,
  ): Promise<InstallationResult | undefined> {
    debug('Setting up IDE integration');

    // Skip auto-install if disabled
    if (process.env.TAKUMI_IDE_SKIP_AUTO_INSTALL) {
      debug('Skipping auto-install due to environment variable');
      return;
    }

    const platformInfo: PlatformInfo = {
      terminal,
      platform: process.platform,
    };

    // Check and install extension
    const isInstalled = await isExtensionInstalled(platformInfo);
    debug('Extension installed:', isInstalled);

    const vsixPath = process.env.TAKUMI_VSIX_PATH || VSIX_PATH;
    let result: InstallationResult;
    if (vsixPath && !isInstalled) {
      result = await attemptInstallation(platformInfo, vsixPath);
    } else {
      result = {
        installed: isInstalled,
        error: isInstalled ? null : 'VSIX path not provided',
        installedVersion: isInstalled ? '1.0.22' : null,
      };
    }

    debug('Installation result:', result);
    return result;
  }
}
