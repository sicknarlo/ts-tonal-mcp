import { mkdirSync } from 'node:fs';
import type TonalClient from '@dlwiest/ts-tonal-client';
import { TonalService } from '../src/services/tonal-service.js';
import type { TonalEnv } from './env.js';

const CACHE_DIR = '/tmp/ts-tonal-client';
let service: TonalService | undefined;

export function tonalClientFor(env: TonalEnv): () => Promise<TonalClient> {
  service ??= new TonalService({
    username: env.TONAL_USERNAME,
    password: env.TONAL_PASSWORD,
    cacheDir: CACHE_DIR,
  });
  const tonal = service;
  return () => {
    // Workers gives each request an empty /tmp, but the client outlives the request that
    // created its cache dir.
    mkdirSync(CACHE_DIR, { recursive: true });
    return tonal.getClient();
  };
}
