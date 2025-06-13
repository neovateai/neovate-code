import WebSocket from 'ws';

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
    // 方法1: 环境变量
    const envPort = process.env.CLAUDE_CODE_SSE_PORT;
    if (envPort) return parseInt(envPort);

    // 方法2: 扫描锁文件
    // const lockDir = path.join(os.homedir(), '.claude', 'ide');
    // if (fs.existsSync(lockDir)) {
    //   const lockFiles = fs.readdirSync(lockDir)
    //     .filter(f => f.endsWith('.lock'));

    //   if (lockFiles.length > 0) {
    //     const port = lockFiles[0].replace('.lock', '');
    //     return parseInt(port);
    //   }
    // }
  }

  // 连接到 extension
  async connect() {
    const port = await this.findPort();
    if (!port) {
      throw new Error('Could not find the IDE extension port');
    }

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(`ws://127.0.0.1:${port}`);

      this.ws.on('open', () => {
        console.log('Connected to the IDE extension.');
        resolve();
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      });

      this.ws.on('error', reject);
    });
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // 处理消息
  handleMessage(message: any) {
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
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

      this.ws!.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          method,
          params,
        }),
      );

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
    return this.request('tools/call', {
      name: 'openFile',
      arguments: {
        filePath,
        preview: options.preview || false,
        startText: '',
        endText: '',
      },
    });
  }

  async getWorkspaceFolders(): Promise<any> {
    return this.request('tools/call', {
      name: 'getWorkspaceFolders',
      arguments: {},
    });
  }

  async getOpenEditors(): Promise<any> {
    return this.request('tools/call', {
      name: 'getOpenEditors',
      arguments: {},
    });
  }

  async getDiagnostics(): Promise<any> {
    return this.request('tools/call', {
      name: 'getDiagnostics',
      arguments: {},
    });
  }

  async getCurrentSelection(): Promise<any> {
    return this.request('tools/call', {
      name: 'getCurrentSelection',
      arguments: {},
    });
  }
}
