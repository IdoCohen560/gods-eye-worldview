// OpenSky switched to OAuth2 client_credentials in 2024. Basic auth is no longer accepted.
// Docs: https://openskynetwork.github.io/opensky-api/rest.html
//
// Flow: POST client_id + client_secret to the token endpoint → receive a bearer token
// valid for ~30 min. Cache in-memory and refresh 60s before expiry.

const TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const MARGIN_MS = 60_000;

interface TokenState { accessToken: string; expiresAt: number; }
let memCached: TokenState | null = null;
let inflight: Promise<string | null> | null = null;

async function fetchToken(clientId: string, clientSecret: string): Promise<TokenState> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`OpenSky token exchange failed (${resp.status}): ${text.slice(0, 200)}`);
  }
  const data: any = await resp.json();
  if (!data.access_token) throw new Error('OpenSky token response missing access_token');
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 1800) * 1000,
  };
}

/**
 * Returns a valid OpenSky bearer token, or null if credentials are not configured.
 * Requires OPENSKY_CLIENT_ID + OPENSKY_CLIENT_SECRET env vars.
 */
export async function getOpenSkyAccessToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_CLIENT_ID?.trim();
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  if (memCached && Date.now() < memCached.expiresAt - MARGIN_MS) {
    return memCached.accessToken;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      memCached = await fetchToken(clientId, clientSecret);
      return memCached.accessToken;
    } catch (err) {
      console.warn('[opensky-auth] Token fetch failed:', err);
      return memCached?.accessToken ?? null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
