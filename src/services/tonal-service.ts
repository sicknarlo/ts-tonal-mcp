import TonalClient from '@dlwiest/ts-tonal-client';

export interface TonalCredentials {
  username?: string;
  password?: string;
  cacheDir?: string;
}

export class TonalService {
  private client: TonalClient | null = null;

  constructor(
    private readonly credentials: TonalCredentials = {
      username: process.env.TONAL_USERNAME,
      password: process.env.TONAL_PASSWORD,
    },
  ) {}

  async getClient(): Promise<TonalClient> {
    if (this.client) {
      return this.client;
    }

    const { username, password, cacheDir } = this.credentials;

    if (!username || !password) {
      throw new Error('TONAL_USERNAME and TONAL_PASSWORD environment variables are required');
    }

    console.error('Initializing Tonal client...');
    this.client = await TonalClient.create({
      username,
      password,
      cacheDir,
    });
    console.error('Tonal client initialized successfully');

    return this.client;
  }
}
