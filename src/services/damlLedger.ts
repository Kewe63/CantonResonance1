/**
 * Canton Ticket Platform — Daml Ledger Service
 * Direct JSON API client for Canton ledger operations.
 * Supports both Sandbox (via Express proxy) and DevNet (via Vite proxy) modes.
 */

import { authService } from './authService';

export interface LedgerContract<T = any> {
  contractId: string;
  templateId: string;
  payload: T;
  signatories: string[];
  observers: string[];
}

export interface LedgerResponse<T = any> {
  status: number;
  result?: T;
  errors?: string[];
}

export interface EventPayload {
  organizer: string;
  artist: string;
  public: string;
  name: string;
  date: string;
  venue: string;
  totalTickets: number | string;
  price: string;
  royaltyPct: string;
  ticketsSold: number | string;
  maxResaleMultiplier: string | null;
  isCancelled: boolean;
}

export interface UserTicketPayload {
  owner: string;
  organizer: string;
  artist: string;
  public: string;
  eventName: string;
  eventDate: string;
  eventVenue: string;
  seat: string;
  originalPrice: string;
  currentPrice: string;
  royaltyPct: string;
  maxResaleMultiplier: string | null;
  isUsed: boolean;
  transferCount: number | string;
}

export interface SecondaryListingPayload {
  ticket: UserTicketPayload;
  seller: string;
  price: string;
  createdAt: string;
}

export interface RoyaltyReceiptPayload {
  artist: string;
  organizer: string;
  eventName: string;
  salePrice: string;
  royaltyPct: string;
  royaltyAmount: string;
  sellerShare: string;
  seller: string;
  buyer: string;
  ticketSeat: string;
}

export type EventContract = LedgerContract<EventPayload>;
export type TicketContract = LedgerContract<UserTicketPayload>;
export type ListingContract = LedgerContract<SecondaryListingPayload>;
export type RoyaltyContract = LedgerContract<RoyaltyReceiptPayload>;

const MODULE_NAME = 'Ticket';

const KNOWN_FALLBACK_PACKAGE_IDS = [
  '3be69cf15cf50061b020cc7cd9b7cbadb2b7247f5a58c370b39cb0d6800d290a',
  'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0',
];

const MAX_DEVNET_PACKAGE_CANDIDATES = 3;
const PACKAGE_RESOLUTION_TTL_MS = 30_000;

function parseErrorMessage(data: any, fallback = 'Unknown error'): string {
  if (data && typeof data === 'object') {
    if (Array.isArray(data.errors) && data.errors.length > 0) return data.errors.join(', ');
    if (typeof data.error === 'string') return data.error;
    if (typeof data.cause === 'string') return data.cause;
    if (typeof data.message === 'string') return data.message;
  }
  return fallback;
}

function buildPackageIdCandidates(current: string, available: string[]): string[] {
  return [current, ...available, ...KNOWN_FALLBACK_PACKAGE_IDS]
    .filter((p, i, arr) => p && arr.indexOf(p) === i);
}

function isTemplateMissingError(message: string): boolean {
  return message.includes('Templates do not exist') || message.includes('TEMPLATES_OR_INTERFACES_NOT_FOUND');
}

function isSecuritySensitiveError(message: string): boolean {
  return message.toLowerCase().includes('security-sensitive');
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 20_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('aborted')) {
      throw new Error(`DevNet isteği zaman aşımına uğradı (${Math.round(timeoutMs / 1000)}s).`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * API path configuration per mode:
 * - sandbox: /api/canton/* (Express proxy → localhost:7575)
 * - devnet:  /v1/* (Vite proxy → DevNet JSON API)
 */
function getApiPaths(mode: 'sandbox' | 'devnet') {
  return {
    query: mode === 'sandbox' ? '/api/canton/query' : '/bridge/query',
    create: mode === 'sandbox' ? '/api/canton/create' : '/bridge/create',
    exercise: mode === 'sandbox' ? '/api/canton/exercise' : '/bridge/exercise',
    buyTicket: mode === 'sandbox' ? '/api/canton/exercise' : '/bridge/buy-ticket',
  };
}

/**
 * Creates a configured ledger client for a specific party.
 */
export async function createLedgerClient(partyId: string) {
  const mode = authService.activeMode;
  const apiPaths = getApiPaths(mode);


  // Active package ID used for template formatting
  let packageId = KNOWN_FALLBACK_PACKAGE_IDS[0];
  let devnetPackageCandidates: string[] = [];
  let devnetTemplateUnavailable = false;
  let devnetDarUploadAttempted = false;
  const packageResolutionCache = new Map<string, { packageId: string; expiresAt: number }>();

  if (mode === 'sandbox') {
    // Sandbox: fetch from local generated files
    try {
      const pkgRes = await fetch('/api/package-id');
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        packageId = pkgData.packageId;
        console.log('[LEDGER] Sandbox Package ID:', packageId);
      }
    } catch (err) {
      console.warn('Could not fetch sandbox package ID:', err);
    }
  } else if (mode === 'devnet') {
    // DevNet: fetch available package IDs from the bridge
    try {
      const token = authService.activeToken;
      console.log('[LEDGER] Fetching packages from DevNet to resolve template IDs...');
      const pkgRes = await fetchWithTimeout('/bridge/packages', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      }, 10_000);
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        const packages = Array.isArray(pkgData.result)
          ? pkgData.result.filter((p: unknown): p is string => typeof p === 'string' && p.length > 0)
          : [];

        devnetPackageCandidates = packages.slice(0, MAX_DEVNET_PACKAGE_CANDIDATES);
        if (packages.length > 0) {
          console.log('[LEDGER] DevNet package candidates:', devnetPackageCandidates.length, devnetPackageCandidates);
          console.log('[LEDGER] Preferred package ID (local fallback):', packageId);
        }
      }
    } catch (err) {
      console.warn('Could not fetch DevNet packages:', err);
    }
  }

  const headers = () => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    // Include auth token (sandbox unsigned JWT or Keycloak OIDC token)
    const token = authService.activeToken;
    if (token) {
      h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  };

  // Helper to construct fully qualified template ID
  const formatTemplateId = (tid: string, pid = packageId) => {
    if (pid) {
      return `${pid}:${MODULE_NAME}:${tid}`;
    }
    // Fallback: without package ID (may fail on Canton 2.x)
    return `${MODULE_NAME}:${tid}`;
  };

  const refreshDevnetPackages = async () => {
    if (mode !== 'devnet') return;
    try {
      const token = authService.activeToken;
      const pkgRes = await fetchWithTimeout('/bridge/packages', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      }, 10_000);
      if (!pkgRes.ok) return;
      const pkgData = await pkgRes.json();
      const packages = Array.isArray(pkgData.result)
        ? pkgData.result.filter((p: unknown): p is string => typeof p === 'string' && p.length > 0)
        : [];
      if (packages.length > 0) {
        devnetPackageCandidates = packages.slice(0, MAX_DEVNET_PACKAGE_CANDIDATES);
      }
    } catch {
      // ignore package refresh errors
    }
  };

  const resolveWorkingPackageId = async (templateName: string): Promise<string> => {
    if (mode !== 'devnet') return packageId;

    const cached = packageResolutionCache.get(templateName);
    if (cached && cached.expiresAt > Date.now()) {
      packageId = cached.packageId;
      return packageId;
    }

    await refreshDevnetPackages();
    const allCandidates = buildPackageIdCandidates(packageId, devnetPackageCandidates);
    const candidatePids = allCandidates.slice(0, MAX_DEVNET_PACKAGE_CANDIDATES);

    devnetTemplateUnavailable = candidatePids.length === 0;

    if (candidatePids.length > 0) {
      packageId = candidatePids[0];
      packageResolutionCache.set(templateName, {
        packageId,
        expiresAt: Date.now() + PACKAGE_RESOLUTION_TTL_MS,
      });
    }

    if (devnetTemplateUnavailable) {
      console.warn(`[LEDGER] No package candidates visible for ${MODULE_NAME}:${templateName}; command flow will rely on server-side package fallback.`);
    }

    return packageId;
  };

  return {
    partyId,

    async query<T = any>(templateId: string, queryParams?: Record<string, any>): Promise<LedgerContract<T>[]> {
      if (mode === 'devnet') {
        await resolveWorkingPackageId(templateId);
      }

      const res = await fetchWithTimeout(apiPaths.query, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          templateIds: [formatTemplateId(templateId)],
          query: queryParams,
        }),
      }, 15_000);
      const data = await res.json();
      if (!res.ok) throw new Error(`Query Failed: ${parseErrorMessage(data, res.statusText)}`);
      if (data.errors) throw new Error(data.errors.join(', '));
      return data.result || [];
    },

    async create<T = any>(templateId: string, payload: any): Promise<LedgerContract<T>> {
      if (mode === 'devnet') {
        await resolveWorkingPackageId(templateId);
      }

      const templateIdForCreate = mode === 'devnet'
        ? formatTemplateId(templateId, packageId)
        : formatTemplateId(templateId);

      console.log(`[LEDGER] Creating ${templateId} with package ${packageId}`, payload);
      let res = await fetchWithTimeout(apiPaths.create, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          templateId: templateIdForCreate,
          payload,
        }),
      }, 18_000);

      let data = await res.json().catch(() => ({}));
      let errorDetail = parseErrorMessage(data, res.statusText);

      if (
        mode === 'devnet'
        && !res.ok
        && isTemplateMissingError(errorDetail)
        && !devnetDarUploadAttempted
      ) {
        devnetDarUploadAttempted = true;
        console.warn('[LEDGER] Create returned template-missing. Trying one-time DAR upload to DevNet...');

        const uploadRes = await fetchWithTimeout('/bridge/upload-dar', {
          method: 'POST',
          headers: headers(),
        }, 20_000);
        const uploadData = await uploadRes.json().catch(() => ({}));

        if (!uploadRes.ok) {
          const uploadError = parseErrorMessage(uploadData, uploadRes.statusText);
          throw new Error(`DAR upload failed: ${uploadError}`.substring(0, 200));
        }

        console.log('[LEDGER] DAR upload response:', uploadData?.result || uploadData);
        await refreshDevnetPackages();

        if (mode === 'devnet') {
          await resolveWorkingPackageId(templateId);
        }

        const retryTemplateId = mode === 'devnet'
          ? formatTemplateId(templateId, packageId)
          : formatTemplateId(templateId);

        res = await fetchWithTimeout(apiPaths.create, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            templateId: retryTemplateId,
            payload,
          }),
        }, 18_000);

        data = await res.json().catch(() => ({}));
        errorDetail = parseErrorMessage(data, res.statusText);
      }

      if (!res.ok) {
        console.error('[LEDGER] Create Failed:', errorDetail);
        throw new Error(errorDetail.substring(0, 200));
      }

      return data.result;
    },

    async exercise<T = any>(templateId: string, contractId: string, choice: string, argument: any): Promise<T> {
      if (mode === 'devnet') {
        await resolveWorkingPackageId(templateId);

        if (choice === 'BuyTicket') {
          const seat = typeof argument?.seat === 'string' ? argument.seat : '';
          const eventHint = argument?._eventHint && typeof argument._eventHint === 'object' ? argument._eventHint : null;
          const buyer = typeof argument?.buyer === 'string' ? argument.buyer : partyId;

          if (seat && eventHint) {
            const buyRes = await fetchWithTimeout(apiPaths.buyTicket, {
              method: 'POST',
              headers: headers(),
              body: JSON.stringify({
                templateId: formatTemplateId(templateId),
                contractId,
                buyer,
                seat,
                eventHint,
              }),
            }, 18_000);

            const buyData = await buyRes.json().catch(() => ({}));
            if (!buyRes.ok) {
              throw new Error(`Exercise Failed: ${parseErrorMessage(buyData, buyRes.statusText)}`);
            }
            if (buyData.errors) throw new Error(buyData.errors.join(', '));
            return buyData.result;
          }
        }
      }

      const res = await fetchWithTimeout(apiPaths.exercise, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          templateId: formatTemplateId(templateId),
          contractId,
          choice,
          argument,
        }),
      }, 12_000);
      const data = await res.json();
      if (!res.ok) throw new Error(`Exercise Failed: ${parseErrorMessage(data, res.statusText)}`);
      if (data.errors) throw new Error(data.errors.join(', '));
      return data.result;
    },
  };
}

/**
 * Singleton ledger client manager — supports multi-user sessions.
 */
class LedgerManager {
  private clients: Map<string, ReturnType<typeof createLedgerClient>> = new Map();

  getClient(userId: string) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, createLedgerClient(userId));
    }
    return this.clients.get(userId)!;
  }

  clearAll() {
    this.clients.clear();
  }
}

export const ledgerManager = new LedgerManager();
if (typeof window !== 'undefined') {
  // @ts-ignore - Debug: Force clear on every HMR load
  window.ledgerManager = ledgerManager;
  ledgerManager.clearAll();
}
