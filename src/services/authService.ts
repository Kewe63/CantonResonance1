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
  return candidate.trim();
}

export const authService = {
  // Currently active token (works for both sandbox and devnet)
  activeToken: null as string | null,
  activePartyId: null as string | null,
  activeMode: 'sandbox' as AuthMode,

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
      throw new Error(`Keycloak Login Failed: ${res.statusText} - ${errTxt}`);
    }

    const data = await res.json();
    const token = data.access_token;
    this.activeToken = token;
    this.activeMode = 'devnet';

    // 1) Primary source: token actAs claim
    const payload = decodeJwtPayload(token);
    const claimActAs = payload?.['https://daml.com/ledger-api']?.actAs;
    if (Array.isArray(claimActAs) && claimActAs.length > 0) {
      const partyFromClaim = normalizePartyId(claimActAs[0]);
      if (partyFromClaim) {
        this.activePartyId = partyFromClaim;
        return partyFromClaim;
      }
    }

    // 2) Secondary source: legacy fields if they already carry full party ID
    const directCandidates = [
      payload?.party,
      payload?.party_id,
      payload?.primaryParty,
      payload?.preferred_username,
      payload?.sub,
    ];
    for (const candidate of directCandidates) {
      const normalized = normalizePartyId(candidate);
      if (normalized) {
        this.activePartyId = normalized;
        return normalized;
      }
    }

    throw new Error('DevNet token içinde geçerli party ID (actAs) bulunamadı.');
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
