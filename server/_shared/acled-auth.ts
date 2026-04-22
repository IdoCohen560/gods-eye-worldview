// ACLED switched to OAuth2 password grant in 2024. The legacy `?email=&key=`
// query params no longer work. Token expires in 24h; we cache in memory and
// refresh proactively 5 min before expiry.
//
// Docs: https://acleddata.com/api-documentation/getting-started

const TOKEN_URL = 'https://acleddata.com/oauth/token';
const CLIENT_ID = 'acled';
const MARGIN_MS = 5 * 60_000;

interface TokenState { accessToken: string; refreshToken: string; expiresAt: number; }
let memCached: TokenState | null = null;
let inflight: Promise<string | null> | null = null;

async function post(body: URLSearchParams, action: 'exchange' | 'refresh'): Promise<any> {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`ACLED OAuth ${action} failed (${resp.status}): ${text.slice(0, 200)}`);
  }
  return resp.json();
}

async function exchange(email: string, password: string): Promise<TokenState> {
  const data = await post(new URLSearchParams({
    username: email,
    password,
    grant_type: 'password',
    client_id: CLIENT_ID,
  }), 'exchange');
  if (!data.access_token) throw new Error('ACLED exchange missing access_token');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAt: Date.now() + (data.expires_in ?? 86_400) * 1000,
  };
}

async function refresh(refreshToken: string): Promise<TokenState> {
  const data = await post(new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
  }), 'refresh');
  if (!data.access_token) throw new Error('ACLED refresh missing access_token');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 86_400) * 1000,
  };
}

export async function getAcledAccessToken(): Promise<string | null> {
  const email = process.env.ACLED_EMAIL?.trim() || process.env.VITE_ACLED_EMAIL?.trim();
  const password = process.env.ACLED_PASSWORD?.trim() || process.env.VITE_ACLED_PASSWORD?.trim();
  if (!email || !password) return null;

  if (memCached && Date.now() < memCached.expiresAt - MARGIN_MS) {
    return memCached.accessToken;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      if (memCached?.refreshToken) {
        try {
          memCached = await refresh(memCached.refreshToken);
          return memCached.accessToken;
        } catch (e) {
          console.warn('[acled-auth] Refresh failed, re-authenticating:', e);
        }
      }
      memCached = await exchange(email, password);
      return memCached.accessToken;
    } catch (err) {
      console.warn('[acled-auth] Token fetch failed:', err);
      return memCached?.accessToken ?? null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
