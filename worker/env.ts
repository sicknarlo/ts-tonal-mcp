import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';

export interface TonalEnv {
  TONAL_USERNAME: string;
  TONAL_PASSWORD: string;
}

export interface Env extends TonalEnv {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_GITHUB_USERS: string;
  PUBLIC_URL: string;
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: OAuthHelpers;
}
