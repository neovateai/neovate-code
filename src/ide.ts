import createDebug from 'debug';
import WebSocket from 'ws';

const debug = createDebug('takumi:ide');

export class IDE {
  private ws: WebSocket | null;
  private requestId: number;
  private pendingRequests: Map<
    number,
    { resolve: (value: any) => void; reject: (reason?: any) => void }
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
  handleMessage(message: any) {
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
    params: Record<string, any> = {},
  ): Promise<any> {
    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const message = {
        id,
        method,
        params,
      };

      debug('Sending request:', message);
      this.ws!.send(JSON.stringify(message));

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
  ): Promise<any> {
    debug('Opening file:', filePath);
    return this.request('openFile', {
      filePath,
      preview: options.preview || false,
    });
  }

  async openDiff(
    old_file_path: string,
    new_file_path: string,
    new_file_contents: string,
    tab_name: string,
  ): Promise<any> {
    debug('Opening diff:', { old_file_path, new_file_path, tab_name });
    return this.request('openDiff', {
      old_file_path,
      new_file_path,
      new_file_contents,
      tab_name,
    });
  }

  async getWorkspaceFolders(): Promise<any> {
    debug('Getting workspace folders');
    return this.request('getWorkspaceFolders', {});
  }

  async getOpenEditors(): Promise<any> {
    debug('Getting open editors');
    return this.request('getOpenEditors', {});
  }

  async getDiagnostics(): Promise<any> {
    debug('Getting diagnostics');
    return this.request('getDiagnostics', {});
  }

  async getCurrentSelection(): Promise<any> {
    debug('Getting current selection');
    return this.request('getCurrentSelection', {});
  }

  async getLatestSelection(): Promise<any> {
    debug('Getting latest selection');
    return this.request('getLatestSelection', {});
  }

  async closeTab(tab_name: string): Promise<any> {
    debug('Closing tab:', tab_name);
    return this.request('close_tab', { tab_name });
  }

  async closeAllDiffTabs(): Promise<any> {
    debug('Closing all diff tabs');
    return this.request('closeAllDiffTabs', {});
  }
}
