import {
  AuthorizationError,
  CimdFetchError,
  authorizationErrorRedirect,
} from '@cloudflare/workers-oauth-provider';
import { isAllowedLogin } from './allowlist.js';
import { consentPage, escapeHtml } from './consent-page.js';
import type { Env } from './env.js';

export const githubHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === '/authorize' && request.method === 'GET') return await showConsent(request, env);
      if (pathname === '/authorize' && request.method === 'POST') return await startGithubSignIn(request, env);
      if (pathname === '/callback' && request.method === 'GET') return await finishGithubSignIn(request, env);
      return new Response('Not found', { status: 404 });
    } catch (error) {
      if (error instanceof AuthorizationError && error.redirectTo) {
        return Response.redirect(error.redirectTo, 302);
      }
      if (error instanceof AuthorizationError || error instanceof CimdFetchError) {
        const message = error instanceof AuthorizationError ? error.description : 'This app could not be verified.';
        return new Response(escapeHtml(message), {
          status: 400,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
      throw error;
    }
  },
} satisfies ExportedHandler<Env>;

async function showConsent(request: Request, env: Env): Promise<Response> {
  const authRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request);
  const details = await env.OAUTH_PROVIDER.describeConsent(authRequest);
  const consent = await env.OAUTH_PROVIDER.beginConsent(authRequest);
  consent.headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(consentPage(details, consent.handle), { headers: consent.headers });
}

async function startGithubSignIn(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const handle = String(form.get('handle'));
  if (form.get('decision') !== 'approve') {
    const denied = await env.OAUTH_PROVIDER.denyConsent(request, handle);
    denied.headers.set('Location', denied.redirectTo);
    return new Response(null, { status: 302, headers: denied.headers });
  }

  const approved = await env.OAUTH_PROVIDER.approveConsent(request, handle);
  const verifier = crypto.randomUUID() + crypto.randomUUID();
  const { state, headers } = await env.OAUTH_PROVIDER.beginUpstream(approved.request, {
    data: { verifier },
    headers: approved.headers,
  });

  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', callbackUrl(request));
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('code_challenge', await s256(verifier));
  authorize.searchParams.set('code_challenge_method', 'S256');
  headers.set('Location', authorize.href);
  return new Response(null, { status: 302, headers });
}

async function finishGithubSignIn(request: Request, env: Env): Promise<Response> {
  const { request: original, data, headers } =
    await env.OAUTH_PROVIDER.finishUpstream<{ verifier: string }>(request);
  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  if (params.get('error') || !code) {
    headers.set('Location', authorizationErrorRedirect(original, 'access_denied'));
    return new Response(null, { status: 302, headers });
  }

  const login = await fetchGithubLogin(env, code, data.verifier, callbackUrl(request));
  if (!isAllowedLogin(login, env.ALLOWED_GITHUB_USERS)) {
    headers.set(
      'Location',
      authorizationErrorRedirect(original, 'access_denied', `GitHub user ${login} is not allowed`),
    );
    return new Response(null, { status: 302, headers });
  }

  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: original,
    userId: login,
    metadata: { label: login },
    scope: original.scope,
    props: { login },
  });
  headers.set('Location', redirectTo);
  return new Response(null, { status: 302, headers });
}

async function fetchGithubLogin(env: Env, code: string, verifier: string, redirectUri: string): Promise<string> {
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });
  const token = (await tokenResponse.json()) as { access_token?: string; error_description?: string };
  if (!token.access_token) {
    throw new Error(`GitHub token exchange failed: ${token.error_description ?? tokenResponse.status}`);
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      authorization: `Bearer ${token.access_token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'tonal-mcp',
    },
  });
  if (!userResponse.ok) {
    throw new Error(`GitHub user lookup failed: ${userResponse.status}`);
  }
  const user = (await userResponse.json()) as { login: string };
  return user.login;
}

function callbackUrl(request: Request): string {
  return new URL('/callback', request.url).href;
}

async function s256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
