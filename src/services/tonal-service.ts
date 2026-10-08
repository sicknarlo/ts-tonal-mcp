import TonalClient, { TonalClientError } from '@dlwiest/ts-tonal-client';

export interface TonalCredentials {
  username?: string;
  password?: string;
  cacheDir?: string;
}

// Auth0 locks the Tonal account itself after repeated failed logins, so a rejected
// password must not be replayed on every tool call.
const REJECTED_LOGIN_RETRY_MS = 5 * 60 * 1000;

export class TonalService {
  private client: Promise<TonalClient> | null = null;
  private rejectedLogin: { error: unknown; at: number } | null = null;

  constructor(
    private readonly credentials: TonalCredentials = {
      username: process.env.TONAL_USERNAME,
      password: process.env.TONAL_PASSWORD,
    },
  ) {}

  async getClient(): Promise<TonalClient> {
    if (this.rejectedLogin && Date.now() - this.rejectedLogin.at < REJECTED_LOGIN_RETRY_MS) {
      throw this.rejectedLogin.error;
    }

    const { username, password, cacheDir } = this.credentials;
    if (!username || !password) {
      throw new Error('TONAL_USERNAME and TONAL_PASSWORD environment variables are required');
    }

    this.client ??= this.login(username, password, cacheDir);
    return this.client;
  }

  private async login(username: string, password: string, cacheDir: string | undefined): Promise<TonalClient> {
    console.error('Initializing Tonal client...');
    try {
      const client = await TonalClient.create({
        username,
        password,
        cacheDir,
      });
      this.rejectedLogin = null;
      console.error('Tonal client initialized successfully');
      return client;
    } catch (error) {
      this.client = null;
      if (error instanceof TonalClientError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        this.rejectedLogin = { error, at: Date.now() };
      }
      throw error;
    }
  }
}
