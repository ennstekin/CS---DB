/**
 * İkas OAuth 2.0 Authentication
 * Single Responsibility: Handle OAuth token management
 */

export interface IkasAuthConfig {
  clientId: string;
  clientSecret: string;
  storeName: string;
}

export class IkasAuth {
  private token: string | null = null;
  private expiresAt: number | null = null;

  constructor(private config: IkasAuthConfig) {}

  /**
   * Get access token (cached or fetch new)
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.token && this.expiresAt && Date.now() < this.expiresAt) {
      return this.token;
    }

    // Fetch new token
    await this.fetchAccessToken();
    return this.token!;
  }

  /**
   * Fetch new access token from İkas OAuth endpoint
   */
  private async fetchAccessToken(): Promise<void> {
    const url = `https://${this.config.storeName}.myikas.com/api/admin/oauth/token`;

    console.log('🔐 İkas: Requesting access token from:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ İkas OAuth failed:', response.status, errorText);
      throw new Error(`İkas OAuth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Store token with safety margin (expire 60 seconds early)
    this.token = data.access_token;
    this.expiresAt = Date.now() + (data.expires_in - 60) * 1000;

    console.log('✅ İkas: Access token received, expires in', data.expires_in, 'seconds');
  }

  /**
   * Force token refresh
   */
  async refreshToken(): Promise<string> {
    this.token = null;
    this.expiresAt = null;
    return this.getAccessToken();
  }
}
