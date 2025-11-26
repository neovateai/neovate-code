import fs from 'fs';
import path from 'pathe';

const CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const COPILOT_API_KEY_URL = 'https://api.github.com/copilot_internal/v2/token';

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface AccessTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface CopilotTokenResponse {
  token: string;
  expires_at: number;
  refresh_in: number;
  endpoints: {
    api: string;
  };
}

interface AuthState {
  github_token?: string;
  copilot_token?: string;
  copilot_expires?: number;
}

export class GithubProvider {
  authFile: string;
  state: AuthState = {};

  constructor(opts: { authFile: string }) {
    this.authFile = opts.authFile;
    this.loadState();
  }

  /**
   * Load auth state from file
   */
  private loadState(): void {
    try {
      if (fs.existsSync(this.authFile)) {
        const data = fs.readFileSync(this.authFile, 'utf-8');
        this.state = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
    }
  }

  /**
   * Save auth state to file
   */
  private saveState(): void {
    try {
      fs.mkdirSync(path.dirname(this.authFile), { recursive: true });
      fs.writeFileSync(
        this.authFile,
        JSON.stringify(this.state, null, 2),
        'utf-8',
      );
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  }

  async authorize() {
    const response = await fetch(DEVICE_CODE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'GitHubCopilotChat/0.26.7',
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        scope: 'read:user',
      }),
    });
    const data: DeviceCodeResponse = await response.json();
    return {
      device: data.device_code,
      user: data.user_code,
      verification: data.verification_uri,
      interval: data.interval || 5,
      expiry: data.expires_in,
    };
  }

  async poll(deviceCode: string): Promise<'pending' | 'complete' | 'failed'> {
    const response = await fetch(ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'GitHubCopilotChat/0.26.7',
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    if (!response.ok) return 'failed';

    const data: AccessTokenResponse = await response.json();

    if (data.access_token) {
      this.state.github_token = data.access_token;
      this.saveState();
      return 'complete';
    }

    if (data.error === 'authorization_pending') return 'pending';

    if (data.error) return 'failed';

    return 'pending';
  }

  async access(): Promise<string | undefined> {
    if (!this.state.github_token) return;

    // Return cached token if still valid
    if (
      this.state.copilot_token &&
      this.state.copilot_expires &&
      this.state.copilot_expires > Date.now()
    ) {
      return this.state.copilot_token;
    }

    // Get new Copilot API token
    const response = await fetch(COPILOT_API_KEY_URL, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.state.github_token}`,
        'User-Agent': 'GitHubCopilotChat/0.26.7',
        'Editor-Version': 'vscode/1.99.3',
        'Editor-Plugin-Version': 'copilot-chat/0.26.7',
      },
    });

    if (!response.ok) return;

    const tokenData: CopilotTokenResponse = await response.json();

    // Cache the token
    this.state.copilot_token = tokenData.token;
    this.state.copilot_expires = tokenData.expires_at * 1000;
    this.saveState();

    return tokenData.token;
  }
}
