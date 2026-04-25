/**
 * Canton Ticket Platform — Auth Service
 * Supports both Sandbox (unsigned JWT) and DevNet (Keycloak OIDC) modes.
 */

export type AuthMode = 'sandbox' | 'devnet';

export interface SandboxParty {
  identifier: string;   // Full party ID: "Organizer::1220abc..."
  displayName: string;  // Human name: "Organizer"
  isLocal: boolean;
}

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const jsonPayload = new TextDecoder().decode(bytes);

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function normalizePartyId(candidate: unknown): string | null {
  if (typeof candidate !== 'string' || !candidate.trim()) return null;
  const value = candidate.trim();
  if (value.includes('@')) return null;
  if (value.includes(' ')) return null;
  return value;
}

function extractPartyValues(candidate: unknown): string[] {
  if (typeof candidate === 'string') {
    const normalized = normalizePartyId(candidate);
    return normalized ? [normalized] : [];
  }

  if (Array.isArray(candidate)) {
    return [...new Set(candidate.flatMap(extractPartyValues))];
  }

  if (candidate && typeof candidate === 'object') {
    const c = candidate as Record<string, unknown>;
    const nestedCandidates = [
      c.actAs,
      c.readAs,
      c.party,
      c.party_id,
      c.primaryParty,
      c.identifier,
      c.value,
      c.values,
      c.partyId,
      c.partyID,
    ];
    return [...new Set(nestedCandidates.flatMap(extractPartyValues))];
  }

  return [];
}

export const authService = {
  // Currently active token (works for both sandbox and devnet)
  activeToken: null as string | null,
  activePartyId: null as string | null,
  activeMode: 'sandbox' as AuthMode,
  knownDevnetPartyMap: {
    kewe63: '1cd9051f-46da-4cc0-88df-f0c2cb475c87::1220195a56748e538153ecc527422256c235ff27b367483b04e161d3bbc62b1ebf32',
    '1cd9051f-46da-4cc0-88df-f0c2cb475c87': '1cd9051f-46da-4cc0-88df-f0c2cb475c87::1220195a56748e538153ecc527422256c235ff27b367483b04e161d3bbc62b1ebf32',
    '1cd9051f-46da-4cc0-88df-f0c2cb475c87::1220195a56748e538153ecc527422256c235ff27b367483b04e161d3bbc62b1ebf32': 'kewe63',
  } as Record<string, string>,

  /**
   * Generate an unsigned sandbox JWT token.
   */
  generateSandboxToken(actAs: string[] = [], readAs: string[] = [], admin: boolean = false): string {
    const header = { alg: 'none', typ: 'JWT' };
    const payload: any = {
      exp: Math.floor(Date.now() / 1000) + 86400,
      'https://daml.com/ledger-api': {
        ledgerId: 'sandbox',
        applicationId: 'canton-ticket',
        admin,
        actAs,
        readAs,
      },
    };

    const toBase64Url = (obj: any) =>
      btoa(JSON.stringify(obj))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return `${toBase64Url(header)}.${toBase64Url(payload)}.`;
  },

  /**
   * Fetch all parties from the sandbox via the server's admin endpoint.
   */
  async fetchSandboxParties(): Promise<SandboxParty[]> {
    const res = await fetch('/api/canton/parties');
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Sandbox partileri alınamadı: ${res.status} - ${text}`);
    }
    const data = await res.json();
    return data.result || [];
  },

  /**
   * Login to sandbox as a specific party (by display name).
   * 1. Fetches real party list from sandbox
   * 2. Finds the party by display name
   * 3. Generates unsigned JWT with the full party identifier
   */
  async loginToSandbox(displayName: string): Promise<string> {
    console.log(`[AUTH] Sandbox login as "${displayName}"...`);
    
    const parties = await this.fetchSandboxParties();
    console.log('[AUTH] Available parties:', parties.map(p => `${p.displayName} (${p.identifier})`));

    // Find exact match by display name
    let party = parties.find(p => p.displayName === displayName);
    
    // Fallback: case-insensitive match
    if (!party) {
      party = parties.find(p => p.displayName.toLowerCase() === displayName.toLowerCase());
    }

    // Fallback: identifier starts with display name
    if (!party) {
      party = parties.find(p => p.identifier.startsWith(displayName));
    }

    if (!party) {
      throw new Error(
        `"${displayName}" adlı party sandbox'ta bulunamadı. ` +
        `Mevcut partiler: ${parties.map(p => p.displayName).join(', ') || 'hiçbiri'}. ` +
        `Sandbox'ın çalıştığından ve Setup script'inin yüklendiğinden emin olun.`
      );
    }

    const fullPartyId = party.identifier;
    console.log(`[AUTH] Found party: ${party.displayName} → ${fullPartyId}`);

    // Generate token with the FULL party identifier
    const token = this.generateSandboxToken([fullPartyId], [fullPartyId]);
    
    this.activeToken = token;
    this.activePartyId = fullPartyId;
    this.activeMode = 'sandbox';

    return fullPartyId;
  },

  /**
   * Login via Keycloak OIDC (DevNet mode).
   */
  async loginWithKeycloak(email: string, password: string): Promise<string> {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', 'web-app-ui-hackcanton-01-devnet');
    params.append('username', email);
    params.append('password', password);
    params.append('scope', 'openid daml_ledger_api offline_access');

    const res = await fetch('https://keycloak.naas.noders.services/realms/noders-appsfactory/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const errTxt = await res.text();
      const normalized = errTxt.toLowerCase();
      if (normalized.includes('invalid_grant') || normalized.includes('invalid user credentials')) {
        throw new Error('Keycloak Login Failed: Kullanıcı adı/e-posta veya şifre hatalı (invalid_grant).');
      }
      throw new Error(`Keycloak Login Failed: ${res.status || res.statusText} - ${errTxt}`);
    }

    const data = await res.json();
    const token = data.access_token;
    this.activeToken = token;
    this.activeMode = 'devnet';

    // 1) Primary source: token claims (array/string/nested)
    const payload = decodeJwtPayload(token);
    const partyCandidatesRaw = [
      payload?.['https://daml.com/ledger-api']?.actAs,
      payload?.actAs,
      payload?.party,
      payload?.party_id,
      payload?.primaryParty,
      payload?.['https://daml.com/ledger-api'],
    ].flatMap(extractPartyValues);

    const partyCandidates = [...new Set(partyCandidatesRaw.flatMap((party) => {
      const alias = this.knownDevnetPartyMap[party];
      if (alias && alias !== party) return [party, alias];
      return [party];
    }))];

    if (partyCandidates.length > 0) {
      this.activePartyId = partyCandidates[0];
      return partyCandidates[0];
    }

    // Do not block login if token omits explicit party claims.
    // Server-side bridge will still enforce authorization on command submit.
    const fallbackUserIdRaw = normalizePartyId(payload?.preferred_username)
      || normalizePartyId(payload?.sub)
      || email;

    const fallbackUserId = this.knownDevnetPartyMap[fallbackUserIdRaw] || fallbackUserIdRaw;
    this.activePartyId = fallbackUserId;
    return fallbackUserId;
  },

  /**
   * Logout / clear state.
   */
  logout() {
    this.activeToken = null;
    this.activePartyId = null;
  },

  async getPartyId(userId: string): Promise<string> {
    if (this.activePartyId) return this.activePartyId;
    return userId;
  },

  async getAllParties(): Promise<SandboxParty[]> {
    try {
      return await this.fetchSandboxParties();
    } catch {
      return [];
    }
  }
};
