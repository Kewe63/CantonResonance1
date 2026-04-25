import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

console.log("Starting Canton Resonance Server...");
console.log("Canton API URL configured:", !!process.env.CANTON_JSON_API_URL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: Generate an unsigned JWT for sandbox
function generateSandboxToken(actAs: string[] = [], readAs: string[] = [], admin: boolean = true): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    "https://daml.com/ledger-api": {
      "ledgerId": "sandbox",
      "applicationId": "canton-ticket-app",
      "admin": admin,
      "actAs": actAs,
      "readAs": readAs
    }
  })).toString('base64url');
  return `${header}.${body}.`;
}

// Shortcut for admin token
function generateAdminToken(): string {
  return generateSandboxToken([], [], true);
}

/**
 * Ensures a valid Authorization header exists for Canton JSON API requests.
 * If the client provides one, use it. Otherwise, generate a server-side
 * fallback token with all sandbox parties (for --allow-insecure-tokens mode).
 */
let cachedPartyIds: string[] | null = null;
let partyCacheTime = 0;

async function fetchAndCacheParties(): Promise<string[]> {
  const now = Date.now();
  if (cachedPartyIds && now - partyCacheTime < 60_000) return cachedPartyIds;
  
  try {
    const adminToken = generateAdminToken();
    const CANTON_URL = process.env.CANTON_JSON_API_URL || 'http://localhost:7575';
    const res = await fetch(`${CANTON_URL}/v1/parties`, {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      cachedPartyIds = (data.result || []).map((p: any) => p.identifier);
      partyCacheTime = now;
      console.log(`[AUTH] Cached ${cachedPartyIds.length} sandbox parties`);
      return cachedPartyIds;
    }
  } catch (e) {
    console.warn('[AUTH] Could not fetch parties for fallback token:', e);
  }
  return cachedPartyIds || [];
}

function resolveAuthHeader(clientAuth: string | undefined): string {
  if (clientAuth && clientAuth.length > 10 && clientAuth.startsWith('Bearer ')) {
    return clientAuth;
  }
  // Fallback: generate server-side admin token (for admin-only routes)
  console.log('[AUTH] No client token — using server-side admin fallback');
  return `Bearer ${generateAdminToken()}`;
}

async function resolveAuthHeaderWithParties(clientAuth: string | undefined): Promise<string> {
  if (clientAuth && clientAuth.length > 10 && clientAuth.startsWith('Bearer ')) {
    return clientAuth;
  }
  // Fallback: generate token with ALL sandbox parties so query/create/exercise work
  const partyIds = await fetchAndCacheParties();
  console.log(`[AUTH] No client token — generating fallback with ${partyIds.length} parties`);
  return `Bearer ${generateSandboxToken(partyIds, partyIds, true)}`;
}

function parseJwtPayload(authHeader: string | undefined): Record<string, any> | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
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

function extractActAs(authHeader: string | undefined): string[] {
  const payload = parseJwtPayload(authHeader);
  if (!payload) return [];

  const ledgerApi = payload['https://daml.com/ledger-api'];
  const candidates = [
    ledgerApi?.actAs,
    payload.actAs,
    payload.party,
    payload.party_id,
    payload.primaryParty,
  ];

  return [...new Set(candidates.flatMap(extractPartyValues))];
}


function normalizeTemplateId(templateId: any): string | undefined {
  if (typeof templateId === 'string' && templateId.length > 0) return templateId;
  if (templateId && typeof templateId === 'object') {
    const packageId = templateId.packageId || templateId.package_id;
    const moduleName = templateId.moduleName || templateId.module_name;
    const entityName = templateId.entityName || templateId.entity_name;
    if (packageId && moduleName && entityName) {
      return `${packageId}:${moduleName}:${entityName}`;
    }
  }
  return undefined;
}

function normalizeTemplateName(templateId: any): string | undefined {
  const normalized = normalizeTemplateId(templateId);
  if (!normalized) return undefined;
  const parts = normalized.split(':');
  if (parts.length < 3) return undefined;
  return `${parts[1]}:${parts[2]}`;
}

function normalizeContractCandidate(candidate: any): any | null {
  if (!candidate || typeof candidate !== 'object') return null;

  const contractId = candidate.contractId || candidate.contract_id;
  const templateId = normalizeTemplateId(candidate.templateId || candidate.template_id);
  const payload =
    candidate.payload
    || candidate.createArgument
    || candidate.create_argument
    || candidate.createArguments
    || candidate.create_arguments;

  if (!contractId || !templateId || !payload || typeof payload !== 'object') return null;

  const signatories = Array.isArray(candidate.signatories) ? candidate.signatories : [];
  const observers = Array.isArray(candidate.observers)
    ? candidate.observers
    : Array.isArray(candidate.witnessParties)
      ? candidate.witnessParties
      : [];

  return {
    contractId,
    templateId,
    payload,
    signatories,
    observers,
  };
}

function extractContractsDeep(node: any): any[] {
  const found: any[] = [];
  const seen = new Set<string>();

  const walk = (value: any) => {
    if (!value || typeof value !== 'object') return;

    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }

    const candidates = [
      value,
      value.createdEvent,
      value.createEvent,
      value.activeContract,
      value.contract,
      value.CreatedTreeEvent?.value,
      value.CreatedEvent?.value,
      value.created,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeContractCandidate(candidate);
      if (!normalized) continue;
      const key = `${normalized.contractId}::${normalized.templateId}`;
      if (!seen.has(key)) {
        seen.add(key);
        found.push(normalized);
      }
    }

    for (const child of Object.values(value)) {
      walk(child);
    }
  };

  walk(node);
  return found;
}

function matchesQueryObject(payload: any, query: any): boolean {
  if (!query || (typeof query === 'object' && Object.keys(query).length === 0)) return true;
  if (typeof query !== 'object' || query === null) return payload === query;
  if (typeof payload !== 'object' || payload === null) return false;

  return Object.entries(query).every(([k, v]) => matchesQueryObject((payload as any)[k], v));
}

function matchesEventHintPayload(payload: any, eventHint: Record<string, any> | null | undefined): boolean {
  if (!payload || typeof payload !== 'object' || !eventHint || typeof eventHint !== 'object') return false;

  const nameMatches = payload.name === eventHint.name;
  const dateMatches = payload.date === eventHint.date;
  const venueMatches = payload.venue === eventHint.venue;
  const organizerMatches = String(payload.organizer || '') === String(eventHint.organizer || '');

  if (nameMatches && dateMatches && venueMatches && organizerMatches) return true;

  const strongMatchCount = [nameMatches, dateMatches, venueMatches].filter(Boolean).length;
  return strongMatchCount >= 2;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readResponseBody(response: Response): Promise<{ text: string; data: any | null }> {
  const text = await response.text();
  if (!text) return { text: '', data: null };
  try {
    return { text, data: JSON.parse(text) };
  } catch {
    return { text, data: null };
  }
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 20_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractRightParties(node: any): string[] {
  const found = new Set<string>();

  const visit = (value: any) => {
    if (!value || typeof value !== 'object') return;

    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }

    const typeValue = String((value.type || value.right || value.kind || '')).toLowerCase();
    const canActAsType =
      typeValue.includes('canactas')
      || typeValue.includes('execute')
      || typeValue.includes('actas');

    const directParty = normalizePartyId(value.party)
      || normalizePartyId(value.party_id)
      || normalizePartyId(value.partyId)
      || normalizePartyId(value.identifier);

    if (canActAsType && directParty) {
      found.add(directParty);
    }

    for (const child of Object.values(value)) {
      visit(child);
    }
  };

  visit(node);
  return [...found];
}

function mergeUniqueParties(...groups: string[][]): string[] {
  const expanded = groups.flatMap((group) =>
    group.flatMap((party) => {
      const normalized = party.trim();
      if (!normalized) return [];
      const alias = KNOWN_DEVNET_PARTY_ALIASES[normalized];
      if (alias && alias !== normalized) {
        return [normalized, alias];
      }
      return [normalized];
    })
  );
  return [...new Set(expanded)];
}

async function resolveActAsFromRights(
  passThrough: (targetPath: string, init: RequestInit, timeoutMs?: number) => Promise<{ response: Response; parsed: any; text: string; targetPath: string }>,
  relayAuth: string,
  fallbackParty?: string,
): Promise<string[]> {
  const rightPaths = [
    '/v2/user/rights',
    '/v2/users/me/rights',
    '/v2/users/rights',
  ];

  for (const rightPath of rightPaths) {
    try {
      const rightsRes = await passThrough(rightPath, {
        method: 'GET',
        headers: { 'Authorization': relayAuth },
      }, 10_000);

      if (!rightsRes.response.ok) {
        continue;
      }

      const parties = extractRightParties(rightsRes.parsed);
      if (parties.length > 0) {
        return parties;
      }
    } catch {
      // ignore and try next path
    }
  }

  if (fallbackParty) return [fallbackParty];
  return [];
}

function getErrorMessage(parsed: any, rawText: string): string {
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) return parsed.errors.join(', ');
    if (typeof parsed.error === 'string') return parsed.error;
    if (typeof parsed.cause === 'string') return parsed.cause;
    if (typeof parsed.message === 'string') return parsed.message;
  }
  return rawText || 'Unknown bridge error';
}

function isTemplateMissingError(message: string): boolean {
  return message.includes('Templates do not exist') || message.includes('TEMPLATES_OR_INTERFACES_NOT_FOUND');
}

function isSecuritySensitiveError(message: string): boolean {
  return message.toLowerCase().includes('security-sensitive');
}

function isAuthorizerMismatchError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('requires authorizers')
    || normalized.includes('requires authorizer')
    || (normalized.includes('interpretation error') && normalized.includes('authorizer'));
}

const KNOWN_DEVNET_PACKAGE_IDS = [
  '3be69cf15cf50061b020cc7cd9b7cbadb2b7247f5a58c370b39cb0d6800d290a',
  'a398ea626d8d5df5db30bab757ef1ce24b8e001428df390c6fc6fdc4980e68b0',
];

const KNOWN_DEVNET_PARTY_ALIASES: Record<string, string> = {
  kewe63: '1cd9051f-46da-4cc0-88df-f0c2cb475c87::1220195a56748e538153ecc527422256c235ff27b367483b04e161d3bbc62b1ebf32',
  '1cd9051f-46da-4cc0-88df-f0c2cb475c87': '1cd9051f-46da-4cc0-88df-f0c2cb475c87::1220195a56748e538153ecc527422256c235ff27b367483b04e161d3bbc62b1ebf32',
  '1cd9051f-46da-4cc0-88df-f0c2cb475c87::1220195a56748e538153ecc527422256c235ff27b367483b04e161d3bbc62b1ebf32': 'kewe63',
};
const KNOWN_DEVNET_PRIMARY_PARTY = '1cd9051f-46da-4cc0-88df-f0c2cb475c87::1220195a56748e538153ecc527422256c235ff27b367483b04e161d3bbc62b1ebf32';

const RECENT_CREATED_CONTRACT_TTL_MS = 5 * 60_000;
const MAX_RECENT_CREATED_CONTRACTS = 200;
const ENABLE_BRIDGE_DEBUG_LOGS = process.env.BRIDGE_DEBUG === 'true';

type CachedCreatedContract = {
  contract: any;
  createdAt: number;
};

type SyntheticContractRecord = {
  templateId: string;
  payload: any;
  createdAt: number;
  resolvedContractId?: string;
};

const recentCreatedContracts: CachedCreatedContract[] = [];
const syntheticContractsById = new Map<string, SyntheticContractRecord>();

function pruneRecentCreatedContracts(now = Date.now()) {
  for (let i = recentCreatedContracts.length - 1; i >= 0; i--) {
    if (now - recentCreatedContracts[i].createdAt > RECENT_CREATED_CONTRACT_TTL_MS) {
      recentCreatedContracts.splice(i, 1);
    }
  }

  if (recentCreatedContracts.length > MAX_RECENT_CREATED_CONTRACTS) {
    recentCreatedContracts.splice(0, recentCreatedContracts.length - MAX_RECENT_CREATED_CONTRACTS);
  }
}

function isSyntheticContract(contract: any): boolean {
  return typeof contract?.contractId === 'string' && contract.contractId.startsWith('unparsed-');
}

function deepEqualJson(a: any, b: any): boolean {
  if (a === b) return true;

  if (typeof a !== typeof b) return false;

  if (a === null || b === null) return a === b;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqualJson(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqualJson(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

function cacheCreatedContract(candidate: any) {
  const normalized = normalizeContractCandidate(candidate);
  if (!normalized) return;

  pruneRecentCreatedContracts();

  const normalizedTemplate = normalizeTemplateId(normalized.templateId);
  const normalizedTemplateName = normalizeTemplateName(normalized.templateId);

  const existingIndex = recentCreatedContracts.findIndex((entry) => {
    if (entry.contract.contractId !== normalized.contractId) return false;

    const entryTemplate = normalizeTemplateId(entry.contract.templateId);
    if (entryTemplate && normalizedTemplate && entryTemplate === normalizedTemplate) return true;

    const entryTemplateName = normalizeTemplateName(entry.contract.templateId);
    return !!(entryTemplateName && normalizedTemplateName && entryTemplateName === normalizedTemplateName);
  });

  if (existingIndex >= 0) {
    recentCreatedContracts[existingIndex] = { contract: normalized, createdAt: Date.now() };
  } else {
    recentCreatedContracts.push({ contract: normalized, createdAt: Date.now() });
  }

  if (isSyntheticContract(normalized)) {
    syntheticContractsById.set(normalized.contractId, {
      templateId: normalized.templateId,
      payload: normalized.payload,
      createdAt: Date.now(),
    });
  }

  if (!isSyntheticContract(normalized)) {
    for (const [syntheticId, record] of syntheticContractsById.entries()) {
      if (record.resolvedContractId) continue;
      if (!deepEqualJson(record.payload, normalized.payload)) continue;
      const sameTemplate =
        normalizeTemplateId(record.templateId) === normalizeTemplateId(normalized.templateId)
        || normalizeTemplateName(record.templateId) === normalizeTemplateName(normalized.templateId);
      if (!sameTemplate) continue;
      record.resolvedContractId = normalized.contractId;
      syntheticContractsById.set(syntheticId, record);
    }
  }

  pruneRecentCreatedContracts();
}

function getRecentCreatedContracts(templateIds: string[]): CachedCreatedContract[] {
  pruneRecentCreatedContracts();
  const normalizedTemplateSet = new Set(
    templateIds
      .map((templateId) => normalizeTemplateId(templateId))
      .filter((templateId): templateId is string => typeof templateId === 'string' && templateId.length > 0)
  );
  const normalizedTemplateNameSet = new Set(
    templateIds
      .map((templateId) => normalizeTemplateName(templateId))
      .filter((templateName): templateName is string => typeof templateName === 'string' && templateName.length > 0)
  );

  return recentCreatedContracts.filter(({ contract }) => {
    const normalizedTemplate = normalizeTemplateId(contract.templateId);
    const normalizedTemplateName = normalizeTemplateName(contract.templateId);

    if (normalizedTemplate && normalizedTemplateSet.has(normalizedTemplate)) return true;
    if (normalizedTemplateName && normalizedTemplateNameSet.has(normalizedTemplateName)) return true;
    return false;
  });
}

function mergeLiveAndRecentContracts(
  liveContracts: any[],
  recentContracts: CachedCreatedContract[],
  queryFilter: any,
): any[] {
  const now = Date.now();

  for (const [syntheticId, record] of syntheticContractsById.entries()) {
    if (now - record.createdAt > RECENT_CREATED_CONTRACT_TTL_MS) {
      syntheticContractsById.delete(syntheticId);
    }
  }

  const merged = [...liveContracts];

  for (const { contract: recentContract, createdAt } of recentContracts) {
    if (!matchesQueryObject(recentContract.payload, queryFilter)) continue;

    const recentTemplate = normalizeTemplateId(recentContract.templateId);
    const recentTemplateName = normalizeTemplateName(recentContract.templateId);

    const exactExists = merged.some((liveContract) => {
      if (liveContract.contractId !== recentContract.contractId) return false;

      const liveTemplate = normalizeTemplateId(liveContract.templateId);
      if (liveTemplate && recentTemplate && liveTemplate === recentTemplate) return true;

      const liveTemplateName = normalizeTemplateName(liveContract.templateId);
      return !!(liveTemplateName && recentTemplateName && liveTemplateName === recentTemplateName);
    });

    if (exactExists) continue;

    if (isSyntheticContract(recentContract)) {
      const replacedByLiveContract = merged.some((liveContract) => {
        const liveTemplate = normalizeTemplateId(liveContract.templateId);
        const liveTemplateName = normalizeTemplateName(liveContract.templateId);

        const sameTemplate =
          (liveTemplate && recentTemplate && liveTemplate === recentTemplate)
          || (liveTemplateName && recentTemplateName && liveTemplateName === recentTemplateName);

        if (!sameTemplate) return false;
        if (!deepEqualJson(liveContract.payload, recentContract.payload)) return false;
        return now - createdAt < 120_000;
      });

      if (replacedByLiveContract) continue;
    }

    merged.push(recentContract);
  }

  const resolvedMerged = merged.map((contract) => {
    if (!isSyntheticContract(contract)) return contract;

    const record = syntheticContractsById.get(contract.contractId);
    if (!record?.resolvedContractId) return contract;

    return {
      ...contract,
      contractId: record.resolvedContractId,
    };
  });

  return resolvedMerged;
}

function buildPackageIdCandidates(currentPackageId: string | undefined, discoveredPackageIds: string[]): string[] {
  return [currentPackageId, ...discoveredPackageIds, ...KNOWN_DEVNET_PACKAGE_IDS]
    .filter((pid, idx, arr): pid is string => typeof pid === 'string' && pid.length > 0 && arr.indexOf(pid) === idx)
    .slice(0, 3);
}

function replaceTemplatePackageId(templateId: string, packageId: string): string {
  const parts = templateId.split(':');
  if (parts.length < 3) return templateId;
  const [, moduleName, entityName] = parts;
  return `${packageId}:${moduleName}:${entityName}`;
}

function normalizeJsonApiPackageIds(parsed: any): string[] {
  if (Array.isArray(parsed?.packageIds)) {
    return parsed.packageIds.filter((p: unknown): p is string => typeof p === 'string' && p.length > 0);
  }
  if (Array.isArray(parsed?.result)) {
    return parsed.result.filter((p: unknown): p is string => typeof p === 'string' && p.length > 0);
  }
  return [];
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Bridge for ledger calls in DevNet mode.
  // Supports Ledger API v2 endpoints and maps responses back to legacy JSON API shape.
  app.all("/bridge/:action", express.json(), async (req, res) => {
    const { action } = req.params;
    const rawAction = String(action || '').trim().toLowerCase();
    const actionKey = rawAction.replace(/_/g, '-');
    const bridgeAction = actionKey === 'buyticket' ? 'buy-ticket' : actionKey;
    const body = req.body || {};

    console.log("=========================================");
    console.log(`>>> BRIDGE HIT: ${req.method} ${action} <<<`);
    console.log("Payload:", JSON.stringify(body));
    console.log("=========================================");

    const baseTarget = 'https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services';
    const clientAuth = req.headers.authorization as string | undefined;

    const hasBearerToken = !!(clientAuth && clientAuth.startsWith('Bearer '));
    const requiresDevnetToken = ['packages', 'upload-dar', 'query', 'create', 'exercise', 'buy-ticket'].includes(bridgeAction);

    if (requiresDevnetToken && !hasBearerToken) {
      return res.status(401).json({
        errors: ['DevNet için geçerli Bearer token gerekli. Önce DevNet login yapın.'],
        status: 401,
      });
    }

    const relayAuth = hasBearerToken
      ? clientAuth!
      : await resolveAuthHeaderWithParties(clientAuth);

    const passThrough = async (targetPath: string, init: RequestInit, timeoutMs = 20_000) => {
      const targetUrl = `${baseTarget}${targetPath}`;
      console.log(`[BRIDGE] Attempting: ${init.method} ${targetUrl}`);
      const response = await fetchWithTimeout(targetUrl, init, timeoutMs);
      const { text, data } = await readResponseBody(response);
      const parsed = data ?? (text ? { raw: text } : {});

      if (ENABLE_BRIDGE_DEBUG_LOGS && ['create', 'exercise'].includes(bridgeAction)) {
        const bodyPreview = typeof init.body === 'string' ? init.body.slice(0, 1200) : '[non-string-body]';
        const responsePreview = text.slice(0, 1200);
        console.log(`[BRIDGE DEBUG] ${action.toUpperCase()} ${targetPath} status=${response.status}`);
        console.log('[BRIDGE DEBUG] Request body preview:', bodyPreview);
        console.log('[BRIDGE DEBUG] Response preview:', responsePreview);
      }

      return { response, parsed, text, targetPath };
    };

    const templateId = normalizeTemplateId(body.templateId);

    try {
      if (bridgeAction === 'packages' && req.method === 'GET') {
        const { response, parsed, text } = await passThrough('/v2/packages', {
          method: 'GET',
          headers: { 'Authorization': relayAuth },
        });

        if (!response.ok) {
          return res.status(response.status).json({
            errors: [getErrorMessage(parsed, text)],
            status: response.status,
          });
        }

        const result = normalizeJsonApiPackageIds(parsed);
        return res.status(200).json({ status: 200, result });
      }

      if (bridgeAction === 'whoami' && req.method === 'GET') {
        const actAs = extractActAs(clientAuth);
        const payload = parseJwtPayload(clientAuth);
        return res.status(200).json({
          status: 200,
          result: {
            actAs,
            ledgerClaim: payload?.['https://daml.com/ledger-api'] || null,
            party: payload?.party || null,
            party_id: payload?.party_id || null,
            primaryParty: payload?.primaryParty || null,
          },
        });
      }

      if (bridgeAction === 'upload-dar' && req.method === 'POST') {
        const darPath = path.resolve(process.cwd(), '.daml/dist/canton-ticket-0.1.0.dar');

        let darContent: Buffer;
        try {
          darContent = await fs.readFile(darPath);
        } catch {
          return res.status(404).json({
            errors: [`DAR file not found at ${darPath}. Build it first.`],
            status: 404,
          });
        }

        const uploadTargets = ['/v2/dars', '/v2/packages'];
        let upload: { response: Response; parsed: any; text: string; targetPath: string } | null = null;

        for (const target of uploadTargets) {
          const attempt = await passThrough(target, {
            method: 'POST',
            headers: {
              'Authorization': relayAuth,
              'Content-Type': 'application/octet-stream',
            },
            body: darContent,
          }, 25_000);

          if (attempt.response.ok) {
            upload = attempt;
            break;
          }

          const attemptMessage = getErrorMessage(attempt.parsed, attempt.text);
          const methodNotSupported = attempt.response.status === 404 || /HttpMethod\(POST\)/.test(attemptMessage);
          if (!methodNotSupported) {
            upload = attempt;
            break;
          }
        }

        if (!upload) {
          return res.status(502).json({
            errors: ['DAR upload endpointine ulaşılamadı.'],
            status: 502,
          });
        }

        if (!upload.response.ok) {
          return res.status(upload.response.status).json({
            errors: [getErrorMessage(upload.parsed, upload.text)],
            status: upload.response.status,
          });
        }

        const packagesCheck = await passThrough('/v2/packages', {
          method: 'GET',
          headers: { 'Authorization': relayAuth },
        });

        const packageIds = packagesCheck.response.ok
          ? normalizeJsonApiPackageIds(packagesCheck.parsed)
          : [];

        return res.status(200).json({
          status: 200,
          result: {
            uploadedDarPath: darPath,
            visiblePackageIds: packageIds,
            note: 'If Ticket templates are still missing, package activation may be required on the DevNet participant.',
          },
        });
      }

      if (bridgeAction === 'query' && req.method === 'POST') {
        const rawActAs = extractActAs(clientAuth);
        const mappedActAs = rawActAs
          .map((party) => KNOWN_DEVNET_PARTY_ALIASES[party])
          .filter((party): party is string => typeof party === 'string' && party.length > 0);

        const tokenActAs = mergeUniqueParties(rawActAs, mappedActAs);

        const templateIds = Array.isArray(body.templateIds)
          ? body.templateIds.map((t: any) => normalizeTemplateId(t)).filter(Boolean)
          : [];

        if (templateIds.length === 0) {
          return res.status(400).json({
            errors: ['templateIds is required for query.'],
            status: 400,
          });
        }

        const templateFilters = templateIds.map((tid: string) => ({ templateId: tid }));
        const queryFilter = body.query || {};

        const rightsActAs = await resolveActAsFromRights(passThrough, relayAuth);

        const attemptPartySets: Array<string[] | undefined> = [];
        if (tokenActAs.length > 0) attemptPartySets.push(tokenActAs);
        if (rightsActAs.length > 0 && rightsActAs.join('|') !== tokenActAs.join('|')) attemptPartySets.push(rightsActAs);

        const orderedIndividualParties = mergeUniqueParties(
          tokenActAs,
          rightsActAs,
          [KNOWN_DEVNET_PRIMARY_PARTY],
        );

        const attemptParties: Array<string | undefined> = [];
        for (const parties of attemptPartySets) {
          for (const party of parties) {
            if (!attemptParties.includes(party)) attemptParties.push(party);
          }
        }
        for (const party of orderedIndividualParties) {
          if (!attemptParties.includes(party)) attemptParties.push(party);
        }
        attemptParties.push(undefined);

        let lastFailureStatus = 500;
        let lastFailureMessage = 'Query failed.';

        for (const party of attemptParties) {
          const queryPayload = party
            ? {
                filter: {
                  filtersByParty: {
                    [party]: { templateFilters },
                  },
                },
                verbose: true,
              }
            : {
                filter: {
                  filtersForAnyParty: { templateFilters },
                },
                verbose: true,
              };

          const { response, parsed, text } = await passThrough('/v2/state/active-contracts', {
            method: 'POST',
            headers: {
              'Authorization': relayAuth,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(queryPayload),
          });

          if (!response.ok) {
            const message = getErrorMessage(parsed, text);
            lastFailureStatus = response.status;
            lastFailureMessage = message;
            if (isSecuritySensitiveError(message)) {
              continue;
            }
            return res.status(response.status).json({
              errors: [message],
              status: response.status,
            });
          }

          const liveContracts = extractContractsDeep(parsed);
          for (const liveContract of liveContracts) {
            cacheCreatedContract(liveContract);
          }

          const recentContracts = getRecentCreatedContracts(templateIds);
          const mergedContracts = mergeLiveAndRecentContracts(liveContracts, recentContracts, queryFilter);
          const filtered = mergedContracts.filter((c) => matchesQueryObject(c.payload, queryFilter));

          if (filtered.length > 0 || !party) {
            return res.status(200).json({ status: 200, result: filtered });
          }
        }

        return res.status(lastFailureStatus).json({
          errors: [lastFailureMessage],
          status: lastFailureStatus,
        });
      }

      if (bridgeAction === 'create' && req.method === 'POST') {
        if (!templateId) {
          return res.status(400).json({ errors: ['templateId is required for create.'], status: 400 });
        }

        const payloadOrganizer = typeof body?.payload?.organizer === 'string' ? body.payload.organizer.trim() : '';
        const payloadArtist = typeof body?.payload?.artist === 'string' ? body.payload.artist.trim() : '';
        const payloadPublic = typeof body?.payload?.public === 'string' ? body.payload.public.trim() : '';

        const organizerAlias = payloadOrganizer ? KNOWN_DEVNET_PARTY_ALIASES[payloadOrganizer] : undefined;
        const artistAlias = payloadArtist ? KNOWN_DEVNET_PARTY_ALIASES[payloadArtist] : undefined;
        const publicAlias = payloadPublic ? KNOWN_DEVNET_PARTY_ALIASES[payloadPublic] : undefined;

        const tokenActAs = extractActAs(clientAuth);
        const rightsActAs = await resolveActAsFromRights(passThrough, relayAuth, organizerAlias || payloadOrganizer || undefined);
        const partyCandidates = mergeUniqueParties(
          tokenActAs,
          rightsActAs,
          organizerAlias ? [organizerAlias] : [],
          artistAlias ? [artistAlias] : [],
          publicAlias ? [publicAlias] : [],
          payloadOrganizer ? [payloadOrganizer] : [],
          payloadArtist ? [payloadArtist] : [],
          payloadPublic ? [payloadPublic] : [],
        );

        if (partyCandidates.length === 0) {
          return res.status(400).json({
            errors: ['Deploy için yetkili party bulunamadı. Token ve rights içinde party bilgisi yok.'],
            status: 400,
          });
        }

        const requestedPackageId = templateId.split(':')[0];
        let discoveredPackageIds: string[] = [];

        try {
          const packagesResult = await passThrough('/v2/packages', {
            method: 'GET',
            headers: { 'Authorization': relayAuth },
          }, 10_000);

          if (packagesResult.response.ok) {
            discoveredPackageIds = Array.isArray((packagesResult.parsed as any)?.packageIds)
              ? (packagesResult.parsed as any).packageIds.filter((p: unknown): p is string => typeof p === 'string' && p.length > 0)
              : [];
          }
        } catch {
          // ignore package discovery failure
        }

        const candidatePackageIds = buildPackageIdCandidates(requestedPackageId, discoveredPackageIds);
        let lastFailureStatus = 500;
        let lastFailureMessage = 'Create failed for all package candidates.';

        for (const candidatePackageId of candidatePackageIds) {
          const candidateTemplateId = replaceTemplatePackageId(templateId, candidatePackageId);

          for (const submitter of partyCandidates) {
            const rawPayload = { ...(body.payload || {}) };
            if (typeof rawPayload.organizer === 'string') rawPayload.organizer = submitter;
            if (typeof rawPayload.artist === 'string') rawPayload.artist = submitter;
            if (typeof rawPayload.public === 'string') rawPayload.public = submitter;

            const createPayload = {
              commandId: `create-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              actAs: [submitter],
              commands: [
                {
                  CreateCommand: {
                    templateId: candidateTemplateId,
                    createArguments: rawPayload,
                  },
                },
              ],
            };

            const createCommandEndpoints = [
              '/v2/commands/submit-and-wait-for-transaction-tree',
              '/v2/commands/submit-and-wait-for-transaction',
              '/v2/commands/submit-and-wait',
            ];

            let response: Response | null = null;
            let parsed: any = null;
            let text = '';

            for (const endpoint of createCommandEndpoints) {
              const attempt = await passThrough(endpoint, {
                method: 'POST',
                headers: {
                  'Authorization': relayAuth,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(createPayload),
              }, 25_000);

              response = attempt.response;
              parsed = attempt.parsed;
              text = attempt.text;

              if (response.ok) break;

              const endpointFailureMessage = getErrorMessage(parsed, text);
              const endpointUnavailable = response.status === 404 || /HttpMethod\(POST\)|unsupported|not found/i.test(endpointFailureMessage);
              if (endpointUnavailable) {
                continue;
              }

              break;
            }

            if (!response) {
              return res.status(502).json({
                errors: ['Create endpointine ulaşılamadı.'],
                status: 502,
              });
            }

            if (response.ok) {
              const created = extractContractsDeep(parsed)[0];
              if (created) {
                cacheCreatedContract(created);
                return res.status(200).json({ status: 200, result: created });
              }

              const maybeContractId =
                (parsed as any)?.contractId
                || (parsed as any)?.contract_id
                || (parsed as any)?.result?.contractId
                || (parsed as any)?.result?.contract_id
                || (parsed as any)?.completion?.result?.contractId
                || (parsed as any)?.completion?.result?.contract_id
                || (parsed as any)?.transaction?.events?.[0]?.created?.contractId
                || (parsed as any)?.transaction?.events?.[0]?.created?.contract_id
                || null;

              if (maybeContractId) {
                const createdFromContractId = {
                  contractId: maybeContractId,
                  templateId: candidateTemplateId,
                  payload: rawPayload,
                  signatories: [submitter],
                  observers: [rawPayload.artist, rawPayload.public].filter(Boolean),
                };
                cacheCreatedContract(createdFromContractId);
                return res.status(200).json({
                  status: 200,
                  result: createdFromContractId,
                });
              }

              try {
                const queryRes = await passThrough('/v2/state/active-contracts', {
                  method: 'POST',
                  headers: {
                    'Authorization': relayAuth,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    filter: {
                      filtersByParty: {
                        [submitter]: {
                          templateFilters: [{ templateId: candidateTemplateId }],
                        },
                      },
                    },
                    verbose: true,
                  }),
                }, 12_000);

                if (queryRes.response.ok) {
                  const recentContracts = extractContractsDeep(queryRes.parsed);
                  const matched = recentContracts.find((c) => matchesQueryObject(c.payload, rawPayload));
                  if (matched) {
                    cacheCreatedContract(matched);
                    return res.status(200).json({ status: 200, result: matched });
                  }
                  if (recentContracts.length > 0) {
                    cacheCreatedContract(recentContracts[0]);
                    return res.status(200).json({ status: 200, result: recentContracts[0] });
                  }
                }
              } catch {
                // ignore query fallback failure
              }

              console.warn('[BRIDGE] Create succeeded but response did not contain a parsable created contract.', JSON.stringify(parsed).slice(0, 800));
              const synthesizedCreated = {
                contractId: `unparsed-${Date.now()}`,
                templateId: candidateTemplateId,
                payload: rawPayload,
                signatories: [rawPayload.organizer].filter(Boolean),
                observers: [rawPayload.artist, rawPayload.public].filter(Boolean),
              };
              cacheCreatedContract(synthesizedCreated);
              return res.status(200).json({
                status: 200,
                result: synthesizedCreated,
              });
            }

            const failureMessage = getErrorMessage(parsed, text);
            lastFailureStatus = response.status;
            lastFailureMessage = failureMessage;

            console.warn(`[BRIDGE] Create failed for package ${candidatePackageId} submitter ${submitter}: ${failureMessage}`);

            if (isTemplateMissingError(failureMessage)) {
              break;
            }

            if (isSecuritySensitiveError(failureMessage)) {
              continue;
            }

            return res.status(response.status).json({
              errors: [failureMessage],
              status: response.status,
            });
          }

          if (isTemplateMissingError(lastFailureMessage)) {
            continue;
          }
        }

        if (isTemplateMissingError(lastFailureMessage)) {
          return res.status(lastFailureStatus).json({
            errors: ['DevNet participant üzerinde Ticket template görünmüyor. Paket yetkisi/aktivasyonu gerekiyor.'],
            status: lastFailureStatus,
          });
        }

        if (isSecuritySensitiveError(lastFailureMessage)) {
          return res.status(lastFailureStatus).json({
            errors: ['Deploy reddedildi: kullanıcı tokenı hiçbir aday party için canActAs yetkisine sahip değil. Participant user-rights ataması gerekli.'],
            status: lastFailureStatus,
          });
        }

        return res.status(lastFailureStatus).json({
          errors: [lastFailureMessage],
          status: lastFailureStatus,
        });
      }

      if (bridgeAction === 'buy-ticket' && req.method === 'POST') {
        const seat = typeof body?.seat === 'string' ? body.seat.trim() : '';
        const eventHint = body?.eventHint && typeof body.eventHint === 'object' ? body.eventHint : null;

        if (!seat || !eventHint) {
          return res.status(400).json({
            errors: ['seat ve eventHint zorunlu.'],
            status: 400,
          });
        }

        const rawBuyer = typeof body?.buyer === 'string' ? body.buyer.trim() : '';
        const buyerFromHint = typeof eventHint?.buyer === 'string' ? eventHint.buyer.trim() : '';
        const buyer = rawBuyer || buyerFromHint;

        const buyerAlias = buyer ? KNOWN_DEVNET_PARTY_ALIASES[buyer] : undefined;

        const tokenActAsRaw = extractActAs(clientAuth);
        const tokenActAsMapped = tokenActAsRaw
          .map((party) => KNOWN_DEVNET_PARTY_ALIASES[party])
          .filter((party): party is string => typeof party === 'string' && party.length > 0);
        const tokenActAs = mergeUniqueParties(tokenActAsRaw, tokenActAsMapped);

        const rightsActAs = await resolveActAsFromRights(passThrough, relayAuth, buyerAlias || buyer || KNOWN_DEVNET_PRIMARY_PARTY);
        const partyCandidates = mergeUniqueParties(
          tokenActAs,
          rightsActAs,
          buyerAlias ? [buyerAlias] : [],
          buyer ? [buyer] : [],
          [KNOWN_DEVNET_PRIMARY_PARTY],
        );

        if (partyCandidates.length === 0) {
          return res.status(400).json({
            errors: ['DevNet token içinde yetkili party (actAs) bulunamadı.'],
            status: 400,
          });
        }

        const requestedTemplateId = typeof body.templateId === 'string' && body.templateId.length > 0
          ? body.templateId
          : '3be69cf15cf50061b020cc7cd9b7cbadb2b7247f5a58c370b39cb0d6800d290a:Ticket:Event';

        const requestedContractId = typeof body.contractId === 'string' ? body.contractId.trim() : '';
        const normalizedTemplateFromRequest = normalizeTemplateId(requestedTemplateId);
        const templateNameFromRequest = normalizeTemplateName(requestedTemplateId);

        let discoveredPackageIds: string[] = [];
        try {
          const packagesResult = await passThrough('/v2/packages', {
            method: 'GET',
            headers: { 'Authorization': relayAuth },
          }, 10_000);

          if (packagesResult.response.ok) {
            discoveredPackageIds = normalizeJsonApiPackageIds(packagesResult.parsed);
          }
        } catch {
          // ignore package discovery failure
        }

        const packageCandidates = normalizedTemplateFromRequest
          ? buildPackageIdCandidates(normalizedTemplateFromRequest.split(':')[0], discoveredPackageIds)
          : [];

        const candidateTemplateIds = [...new Set([
          normalizedTemplateFromRequest,
          ...(normalizedTemplateFromRequest
            ? packageCandidates.map((pid) => replaceTemplatePackageId(normalizedTemplateFromRequest, pid))
            : []),
        ].filter((value): value is string => typeof value === 'string' && value.length > 0))];

        const resolveBuyTargetEvent = async (preferProvidedContractId = true): Promise<{ contractId: string; templateId: string } | null> => {
          if (preferProvidedContractId && requestedContractId) {
            return {
              contractId: requestedContractId,
              templateId: normalizedTemplateFromRequest || requestedTemplateId,
            };
          }
          for (const queryTemplateId of candidateTemplateIds) {
            for (const queryParty of partyCandidates) {
              const queryPayload = {
                filter: {
                  filtersByParty: {
                    [queryParty]: {
                      templateFilters: [{ templateId: queryTemplateId }],
                    },
                  },
                },
                verbose: true,
              };

              const queryRes = await passThrough('/v2/state/active-contracts', {
                method: 'POST',
                headers: {
                  'Authorization': relayAuth,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(queryPayload),
              }, 12_000);

              if (!queryRes.response.ok) {
                const queryMessage = getErrorMessage(queryRes.parsed, queryRes.text);
                if (isSecuritySensitiveError(queryMessage)) {
                  continue;
                }
                continue;
              }

              const contracts = extractContractsDeep(queryRes.parsed);
              const filteredContracts = templateNameFromRequest
                ? contracts.filter((c) => normalizeTemplateName(c?.templateId) === templateNameFromRequest)
                : contracts;

              const matched = filteredContracts.find((c) => matchesEventHintPayload(c?.payload || {}, eventHint));
              if (!matched?.contractId) continue;

              return {
                contractId: matched.contractId,
                templateId: normalizeTemplateId(matched.templateId) || queryTemplateId,
              };
            }
          }

          return null;
        };

        let targetEventResolved = await resolveBuyTargetEvent(true);

        if (!targetEventResolved?.contractId) {
          return res.status(404).json({
            errors: [requestedContractId
              ? 'Buy target event bulunamadı veya görünür değil. Gönderilen contractId bu token için erişilebilir değil olabilir.'
              : 'Buy target event bulunamadı. Event görünürlüğü henüz oluşmamış olabilir.'],
            status: 404,
          });
        }

        let lastFailureStatus = 500;
        let lastFailureMessage = 'BuyTicket failed for all candidate parties.';

        for (const submitter of partyCandidates) {
          let response: Response | null = null;
          let parsed: any = null;
          let text = '';
          let failureMessage = 'BuyTicket failed for all endpoints.';

          for (let staleRetry = 0; staleRetry < 2; staleRetry++) {
            const commandId = `buy-ticket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const exercisePayload = {
              commandId,
              actAs: [submitter],
              commands: [
                {
                  ExerciseCommand: {
                    templateId: targetEventResolved!.templateId,
                    contractId: targetEventResolved!.contractId,
                    choice: 'BuyTicket',
                    choiceArgument: {
                      buyer: submitter,
                      seat,
                    },
                  },
                },
              ],
            };

            const exerciseCommandEndpoints = [
              '/v2/commands/submit-and-wait-for-transaction-tree',
              '/v2/commands/submit-and-wait-for-transaction',
              '/v2/commands/submit-and-wait',
            ];

            response = null;
            parsed = null;
            text = '';

            for (const endpoint of exerciseCommandEndpoints) {
              const attempt = await passThrough(endpoint, {
                method: 'POST',
                headers: {
                  'Authorization': relayAuth,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(exercisePayload),
              }, 25_000);

              response = attempt.response;
              parsed = attempt.parsed;
              text = attempt.text;

              if (response.ok) break;

              const endpointFailureMessage = getErrorMessage(parsed, text);
              const endpointUnavailable = response.status === 404 || /HttpMethod\(POST\)|unsupported|not found/i.test(endpointFailureMessage);
              if (endpointUnavailable) {
                continue;
              }

              break;
            }

            if (!response) {
              return res.status(502).json({
                errors: ['BuyTicket endpointine ulaşılamadı.'],
                status: 502,
              });
            }

            if (response.ok) {
              const contracts = extractContractsDeep(parsed);
              for (const contract of contracts) {
                cacheCreatedContract(contract);
              }

              const exerciseResult = (parsed as any)?.exerciseResult
                ?? (parsed as any)?.result?.exerciseResult
                ?? (parsed as any)?.completion?.result?.exerciseResult
                ?? (parsed as any)?.completion?.result
                ?? (parsed as any)?.result
                ?? null;

              return res.status(200).json({
                status: 200,
                result: {
                  resolvedEventContractId: targetEventResolved!.contractId,
                  exerciseResult,
                  events: contracts,
                },
              });
            }

            failureMessage = getErrorMessage(parsed, text);
            const missingContract = failureMessage.toLowerCase().includes('contract could not be found with id');

            if (missingContract && staleRetry === 0) {
              const refreshedTarget = await resolveBuyTargetEvent(false);
              if (refreshedTarget?.contractId && refreshedTarget.contractId !== targetEventResolved!.contractId) {
                console.log(`[BRIDGE] buy-ticket remap ${targetEventResolved!.contractId} -> ${refreshedTarget.contractId}`);
                targetEventResolved = refreshedTarget;
                continue;
              }
            }

            break;
          }

          lastFailureStatus = response?.status || 500;
          lastFailureMessage = failureMessage;

          if (isSecuritySensitiveError(failureMessage) || isAuthorizerMismatchError(failureMessage)) {
            continue;
          }

          return res.status(lastFailureStatus).json({
            errors: [lastFailureMessage],
            status: lastFailureStatus,
          });
        }

        if (isSecuritySensitiveError(lastFailureMessage)) {
          return res.status(lastFailureStatus).json({
            errors: ['BuyTicket reddedildi: kullanıcı tokenı hiçbir aday party için canActAs yetkisine sahip değil.'],
            status: lastFailureStatus,
          });
        }

        return res.status(lastFailureStatus).json({
          errors: [lastFailureMessage],
          status: lastFailureStatus,
        });
      }

      if (bridgeAction === 'exercise' && req.method === 'POST') {
        if (!templateId || !body.contractId || !body.choice) {
          return res.status(400).json({
            errors: ['templateId, contractId and choice are required for exercise.'],
            status: 400,
          });
        }

        const requestedTemplateId = templateId;

        const argument = body.argument || {};
        const eventHint = argument?._eventHint && typeof argument._eventHint === 'object' ? argument._eventHint : null;

        const normalizedArgument = { ...argument };
        delete (normalizedArgument as any)._eventHint;

        let resolvedContractId = String(body.contractId || '').trim();
        const maybeBuyer = typeof normalizedArgument.buyer === 'string' ? normalizedArgument.buyer.trim() : '';
        const maybeNewOwner = typeof normalizedArgument.newOwner === 'string' ? normalizedArgument.newOwner.trim() : '';

        const buyerAlias = maybeBuyer ? KNOWN_DEVNET_PARTY_ALIASES[maybeBuyer] : undefined;
        const newOwnerAlias = maybeNewOwner ? KNOWN_DEVNET_PARTY_ALIASES[maybeNewOwner] : undefined;

        const tokenActAsRaw = extractActAs(clientAuth);
        const tokenActAsMapped = tokenActAsRaw
          .map((party) => KNOWN_DEVNET_PARTY_ALIASES[party])
          .filter((party): party is string => typeof party === 'string' && party.length > 0);
        const tokenActAs = mergeUniqueParties(tokenActAsRaw, tokenActAsMapped);

        const rightsActAs = await resolveActAsFromRights(passThrough, relayAuth, buyerAlias || maybeBuyer || newOwnerAlias || maybeNewOwner || KNOWN_DEVNET_PRIMARY_PARTY);
        const partyCandidates = mergeUniqueParties(
          tokenActAs,
          rightsActAs,
          buyerAlias ? [buyerAlias] : [],
          newOwnerAlias ? [newOwnerAlias] : [],
          maybeBuyer ? [maybeBuyer] : [],
          maybeNewOwner ? [maybeNewOwner] : [],
          [KNOWN_DEVNET_PRIMARY_PARTY],
        );

        const resolutionPartyCandidates = mergeUniqueParties(
          buyerAlias ? [buyerAlias] : [],
          maybeBuyer ? [maybeBuyer] : [],
          newOwnerAlias ? [newOwnerAlias] : [],
          maybeNewOwner ? [maybeNewOwner] : [],
          partyCandidates,
        );

        if (resolvedContractId.startsWith('unparsed-')) {
          const syntheticKey = resolvedContractId;
          const synthetic = syntheticContractsById.get(syntheticKey);

          const syntheticPayloadCandidates = [synthetic?.payload, eventHint]
            .filter((candidate): candidate is Record<string, any> => !!candidate && typeof candidate === 'object');

          if (syntheticPayloadCandidates.length > 0) {
            const recentTemplateMatches = getRecentCreatedContracts([requestedTemplateId])
              .map((entry) => entry.contract)
              .filter((contract) => !isSyntheticContract(contract));

            const directRecentMatch = recentTemplateMatches.find((contract) =>
              syntheticPayloadCandidates.some((candidate) => deepEqualJson(contract.payload, candidate))
              || syntheticPayloadCandidates.some((candidate) => matchesEventHintPayload(contract.payload, candidate))
            );

            if (directRecentMatch?.contractId) {
              resolvedContractId = directRecentMatch.contractId;
              syntheticContractsById.set(syntheticKey, {
                templateId: directRecentMatch.templateId,
                payload: synthetic?.payload || eventHint || {},
                createdAt: synthetic?.createdAt || Date.now(),
                resolvedContractId: directRecentMatch.contractId,
              });
            }
          }
          if (resolvedContractId.startsWith('unparsed-') && synthetic?.resolvedContractId) {
            resolvedContractId = synthetic.resolvedContractId;
          }

          if (resolvedContractId.startsWith('unparsed-')) {
            let discoveredPackageIds: string[] = [];
            try {
              const packagesResult = await passThrough('/v2/packages', {
                method: 'GET',
                headers: { 'Authorization': relayAuth },
              }, 10_000);

              if (packagesResult.response.ok) {
                discoveredPackageIds = normalizeJsonApiPackageIds(packagesResult.parsed);
              }
            } catch {
              // ignore package discovery failure during synthetic lookup
            }

            const normalizedTemplateFromSynthetic = normalizeTemplateId(synthetic?.templateId);
            const normalizedTemplateFromRequest = normalizeTemplateId(requestedTemplateId);
            const templateNameFromRequest = normalizeTemplateName(requestedTemplateId);
            const packageCandidates = normalizedTemplateFromRequest
              ? buildPackageIdCandidates(normalizedTemplateFromRequest.split(':')[0], discoveredPackageIds)
              : [];

            const candidateTemplateIds = [...new Set([
              normalizedTemplateFromSynthetic,
              normalizedTemplateFromRequest,
              ...(normalizedTemplateFromRequest
                ? packageCandidates.map((pid) => replaceTemplatePackageId(normalizedTemplateFromRequest, pid))
                : []),
            ].filter((value): value is string => typeof value === 'string' && value.length > 0))];

            const payloadCandidates = [synthetic?.payload, eventHint]
              .filter((candidate): candidate is Record<string, any> => !!candidate && typeof candidate === 'object');

            try {
              for (const queryTemplateId of candidateTemplateIds) {
                const queryParties: Array<string | undefined> = resolutionPartyCandidates.length > 0
                  ? resolutionPartyCandidates
                  : [undefined];

                for (const queryParty of queryParties) {
                  const queryPayload = queryParty
                    ? {
                        filter: {
                          filtersByParty: {
                            [queryParty]: {
                              templateFilters: [{ templateId: queryTemplateId }],
                            },
                          },
                        },
                        verbose: true,
                      }
                    : {
                        filter: {
                          filtersForAnyParty: {
                            templateFilters: [{ templateId: queryTemplateId }],
                          },
                        },
                        verbose: true,
                      };

                  const queryRes = await passThrough('/v2/state/active-contracts', {
                    method: 'POST',
                    headers: {
                      'Authorization': relayAuth,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(queryPayload),
                  }, 12_000);

                  if (!queryRes.response.ok) {
                    const queryMessage = getErrorMessage(queryRes.parsed, queryRes.text);
                    if (isSecuritySensitiveError(queryMessage)) {
                      continue;
                    }
                    continue;
                  }

                  const contracts = extractContractsDeep(queryRes.parsed);
                  const filteredContracts = templateNameFromRequest
                    ? contracts.filter((c) => normalizeTemplateName(c?.templateId) === templateNameFromRequest)
                    : contracts;

                  let matched = filteredContracts.find((c) => payloadCandidates.some((candidate) => deepEqualJson(c.payload, candidate)));

                  if (!matched && eventHint) {
                    matched = filteredContracts.find((c) => matchesEventHintPayload(c?.payload || {}, eventHint));
                  }

                  if (matched?.contractId) {
                    resolvedContractId = matched.contractId;
                    syntheticContractsById.set(syntheticKey, {
                      templateId: queryTemplateId,
                      payload: synthetic?.payload || eventHint || {},
                      createdAt: synthetic?.createdAt || Date.now(),
                      resolvedContractId: matched.contractId,
                    });
                    break;
                  }
                }

                if (!resolvedContractId.startsWith('unparsed-')) break;
              }
            } catch {
              // ignore synthetic contract resolution lookup failure
            }
          }

          if (resolvedContractId.startsWith('unparsed-') && eventHint) {
            try {
              const normalizedTemplateFromRequestRetry = normalizeTemplateId(requestedTemplateId);
              const templateNameFromRequestRetry = normalizeTemplateName(requestedTemplateId);

              for (const retryDelay of [1200, 2200]) {
                if (!resolvedContractId.startsWith('unparsed-')) break;
                await sleep(retryDelay);

                const packagesResultRetry = await passThrough('/v2/packages', {
                  method: 'GET',
                  headers: { 'Authorization': relayAuth },
                }, 10_000);

                const discoveredPackageIdsRetry = packagesResultRetry.response.ok
                  ? normalizeJsonApiPackageIds(packagesResultRetry.parsed)
                  : [];

                const packageCandidatesRetry = normalizedTemplateFromRequestRetry
                  ? buildPackageIdCandidates(normalizedTemplateFromRequestRetry.split(':')[0], discoveredPackageIdsRetry)
                  : [];

                const candidateTemplateIdsRetry = [...new Set([
                  normalizedTemplateFromRequestRetry,
                  ...(normalizedTemplateFromRequestRetry
                    ? packageCandidatesRetry.map((pid) => replaceTemplatePackageId(normalizedTemplateFromRequestRetry, pid))
                    : []),
                ].filter((value): value is string => typeof value === 'string' && value.length > 0))];

                for (const queryTemplateId of candidateTemplateIdsRetry) {
                  const queryParties: Array<string | undefined> = resolutionPartyCandidates.length > 0
                    ? resolutionPartyCandidates
                    : [undefined];

                  for (const queryParty of queryParties) {
                    const queryPayload = queryParty
                      ? {
                          filter: {
                            filtersByParty: {
                              [queryParty]: {
                                templateFilters: [{ templateId: queryTemplateId }],
                              },
                            },
                          },
                          verbose: true,
                        }
                      : {
                          filter: {
                            filtersForAnyParty: {
                              templateFilters: [{ templateId: queryTemplateId }],
                            },
                          },
                          verbose: true,
                        };

                    const queryRes = await passThrough('/v2/state/active-contracts', {
                      method: 'POST',
                      headers: {
                        'Authorization': relayAuth,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(queryPayload),
                    }, 12_000);

                    if (!queryRes.response.ok) {
                      const queryMessage = getErrorMessage(queryRes.parsed, queryRes.text);
                      if (isSecuritySensitiveError(queryMessage)) {
                        continue;
                      }
                      continue;
                    }

                    const contracts = extractContractsDeep(queryRes.parsed);
                    const filteredContracts = templateNameFromRequestRetry
                      ? contracts.filter((c) => normalizeTemplateName(c?.templateId) === templateNameFromRequestRetry)
                      : contracts;

                    const matched = filteredContracts.find((c) => matchesEventHintPayload(c?.payload || {}, eventHint));

                    if (matched?.contractId) {
                      resolvedContractId = matched.contractId;
                      syntheticContractsById.set(syntheticKey, {
                        templateId: queryTemplateId,
                        payload: eventHint,
                        createdAt: Date.now(),
                        resolvedContractId: matched.contractId,
                      });
                      break;
                    }
                  }

                  if (!resolvedContractId.startsWith('unparsed-')) break;
                }
              }
            } catch {
              // ignore retry resolution failure
            }
          }

          if (resolvedContractId.startsWith('unparsed-')) {
            const needsPartyScope = resolutionPartyCandidates.length > 0;
            return res.status(404).json({
              errors: [needsPartyScope
                ? 'Kontrat ID çözülemedi. Bu token için party-scope görünürlüğü henüz oluşmadı; aynı kullanıcıyla tekrar deneyin.'
                : 'Kontrat ID çözülemedi. Event henüz ledger üzerinde görünmüyor olabilir; birkaç saniye sonra tekrar deneyin.'],
              status: 404,
            });
          }
        }

        if (partyCandidates.length === 0) {
          return res.status(400).json({
            errors: ['DevNet token içinde yetkili party (actAs) bulunamadı. Hesabı ledger yetkisi olan kullanıcıyla tekrar giriş yapın.'],
            status: 400,
          });
        }

        console.log('[BRIDGE] Exercise party candidates:', partyCandidates);

        const resolveFreshContractIdByHint = async (currentContractId: string): Promise<string> => {
          if (!eventHint) return currentContractId;

          try {
            const normalizedTemplateFromRequest = normalizeTemplateId(requestedTemplateId);
            const templateNameFromRequest = normalizeTemplateName(requestedTemplateId);

            let discoveredPackageIds: string[] = [];
            const packagesResult = await passThrough('/v2/packages', {
              method: 'GET',
              headers: { 'Authorization': relayAuth },
            }, 10_000);

            if (packagesResult.response.ok) {
              discoveredPackageIds = normalizeJsonApiPackageIds(packagesResult.parsed);
            }

            const packageCandidates = normalizedTemplateFromRequest
              ? buildPackageIdCandidates(normalizedTemplateFromRequest.split(':')[0], discoveredPackageIds)
              : [];

            const candidateTemplateIds = [...new Set([
              normalizedTemplateFromRequest,
              ...(normalizedTemplateFromRequest
                ? packageCandidates.map((pid) => replaceTemplatePackageId(normalizedTemplateFromRequest, pid))
                : []),
            ].filter((value): value is string => typeof value === 'string' && value.length > 0))];

            const queryParties: Array<string | undefined> = resolutionPartyCandidates.length > 0
              ? resolutionPartyCandidates
              : [undefined];

            for (const queryTemplateId of candidateTemplateIds) {
              for (const queryParty of queryParties) {
                const queryPayload = queryParty
                  ? {
                      filter: {
                        filtersByParty: {
                          [queryParty]: {
                            templateFilters: [{ templateId: queryTemplateId }],
                          },
                        },
                      },
                      verbose: true,
                    }
                  : {
                      filter: {
                        filtersForAnyParty: {
                          templateFilters: [{ templateId: queryTemplateId }],
                        },
                      },
                      verbose: true,
                    };

                const queryRes = await passThrough('/v2/state/active-contracts', {
                  method: 'POST',
                  headers: {
                    'Authorization': relayAuth,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(queryPayload),
                }, 12_000);

                if (!queryRes.response.ok) {
                  const queryMessage = getErrorMessage(queryRes.parsed, queryRes.text);
                  if (isSecuritySensitiveError(queryMessage)) {
                    continue;
                  }
                  continue;
                }

                const contracts = extractContractsDeep(queryRes.parsed);
                const filteredContracts = templateNameFromRequest
                  ? contracts.filter((c) => normalizeTemplateName(c?.templateId) === templateNameFromRequest)
                  : contracts;

                const matched = filteredContracts.find((c) => matchesEventHintPayload(c?.payload || {}, eventHint));

                if (matched?.contractId) {
                  if (matched.contractId !== currentContractId) {
                    console.log(`[BRIDGE] Remapped stale contract id ${currentContractId} -> ${matched.contractId}`);
                  }
                  return matched.contractId;
                }
              }
            }
          } catch {
            // ignore remap lookup failure
          }

          return currentContractId;
        };

        let lastFailureStatus = 500;
        let lastFailureMessage = 'Exercise failed for all candidate parties.';

        for (const submitter of partyCandidates) {
          let contractIdForSubmitter = resolvedContractId;
          let response: Response | null = null;
          let parsed: any = null;
          let text = '';
          let failureMessage = 'Exercise failed for all endpoints.';

          for (let staleRetry = 0; staleRetry < 2; staleRetry++) {
            const commandId = `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const exercisePayload = {
              commandId,
              actAs: [submitter],
              commands: [
                {
                  ExerciseCommand: {
                    templateId: requestedTemplateId,
                    contractId: contractIdForSubmitter,
                    choice: body.choice,
                    choiceArgument: normalizedArgument,
                  },
                },
              ],
            };

            const exerciseCommandEndpoints = [
              '/v2/commands/submit-and-wait-for-transaction-tree',
              '/v2/commands/submit-and-wait-for-transaction',
              '/v2/commands/submit-and-wait',
            ];

            response = null;
            parsed = null;
            text = '';

            for (const endpoint of exerciseCommandEndpoints) {
              const attempt = await passThrough(endpoint, {
                method: 'POST',
                headers: {
                  'Authorization': relayAuth,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(exercisePayload),
              }, 25_000);

              response = attempt.response;
              parsed = attempt.parsed;
              text = attempt.text;

              if (response.ok) break;

              const endpointFailureMessage = getErrorMessage(parsed, text);
              const endpointUnavailable = response.status === 404 || /HttpMethod\(POST\)|unsupported|not found/i.test(endpointFailureMessage);
              if (endpointUnavailable) {
                continue;
              }

              break;
            }

            if (!response) {
              return res.status(502).json({
                errors: ['Exercise endpointine ulaşılamadı.'],
                status: 502,
              });
            }

            if (response.ok) {
              const contracts = extractContractsDeep(parsed);
              for (const contract of contracts) {
                cacheCreatedContract(contract);
              }

              const exerciseResult = (parsed as any)?.exerciseResult
                ?? (parsed as any)?.result?.exerciseResult
                ?? (parsed as any)?.completion?.result?.exerciseResult
                ?? (parsed as any)?.completion?.result
                ?? (parsed as any)?.result
                ?? null;

              return res.status(200).json({
                status: 200,
                result: {
                  exerciseResult,
                  events: contracts,
                },
              });
            }

            failureMessage = getErrorMessage(parsed, text);
            const missingContract = failureMessage.toLowerCase().includes('contract could not be found with id');

            if (missingContract && eventHint && staleRetry === 0) {
              const remappedContractId = await resolveFreshContractIdByHint(contractIdForSubmitter);
              if (remappedContractId !== contractIdForSubmitter) {
                contractIdForSubmitter = remappedContractId;
                resolvedContractId = remappedContractId;
                continue;
              }
            }

            break;
          }

          lastFailureStatus = response?.status || 500;
          lastFailureMessage = failureMessage;

          if (isSecuritySensitiveError(lastFailureMessage) || isAuthorizerMismatchError(lastFailureMessage)) {
            continue;
          }

          return res.status(lastFailureStatus).json({
            errors: [lastFailureMessage],
            status: lastFailureStatus,
          });
        }

        if (isSecuritySensitiveError(lastFailureMessage)) {
          return res.status(lastFailureStatus).json({
            errors: ['Exercise reddedildi: kullanıcı tokenı hiçbir aday party için canActAs yetkisine sahip değil. Participant user-rights ataması gerekli.'],
            status: lastFailureStatus,
          });
        }

        return res.status(lastFailureStatus).json({
          errors: [lastFailureMessage],
          status: lastFailureStatus,
        });
      }

      return res.status(404).json({
        errors: [`Unsupported bridge action/method: ${req.method} ${action}`],
        status: 404,
      });
    } catch (error: any) {
      const isAbort = error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('aborted');
      if (isAbort) {
        console.warn('[BRIDGE] Request timed out while talking to DevNet');
        return res.status(504).json({
          errors: ['DevNet zaman aşımı: JSON API yanıtı gecikti.'],
          status: 504,
        });
      }

      console.error('[BRIDGE] Unexpected error:', error?.message || error);
      return res.status(500).json({
        errors: [error?.message || 'Bridge internal error'],
        status: 500,
      });
    }
  });

  app.use('/api', express.json());

  // Debug logger for client-side errors
  app.post("/api/debug-log", (req, res) => {
    console.error("=== CLIENT DEBUG ERROR ===");
    console.error("Payload:", JSON.stringify(req.body.payload, null, 2));
    console.error("Error Detail:", req.body.error);
    console.error("==========================");
    res.sendStatus(200);
  });


  // Test route
  app.get("/api/test", (req, res) => {
    res.json({ message: "Express API is live" });
  });

  // Dynamic Package ID resolver
  app.get("/api/package-id", async (req, res) => {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const modulePath = path.resolve(process.cwd(), "src/daml.js/canton-ticket-0.1.0/lib/Ticket/module.js");
      const content = await fs.readFile(modulePath, "utf-8");
      const match = content.match(/templateId:\s*'([a-f0-9]+):Ticket:Event'/);
      if (match && match[1]) {
        res.json({ packageId: match[1] });
      } else {
        res.status(500).json({ error: "Package ID not found in generated code." });
      }
    } catch (err) {
      console.error("Failed to read package ID:", err);
      res.status(500).json({ error: "Failed to read package ID." });
    }
  });

  const CANTON_API_URL = process.env.CANTON_JSON_API_URL;

  const checkCantonConfig = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!CANTON_API_URL) {
      return res.status(503).json({ 
        error: "Canton Configuration Missing", 
        details: "Please set CANTON_JSON_API_URL in your .env file." 
      });
    }
    next();
  };

  // ──────────────────────────────────────────────────────────────
  // LIST PARTIES — uses admin token to fetch all sandbox parties
  // ──────────────────────────────────────────────────────────────
  app.get("/api/canton/parties", checkCantonConfig, async (req, res) => {
    try {
      const adminToken = generateAdminToken();
      console.log("[PARTIES] Fetching parties from sandbox with admin token");
      const response = await fetch(`${CANTON_API_URL}/v1/parties`, {
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
      const data = await response.json();
      console.log("[PARTIES] Response:", JSON.stringify(data).substring(0, 500));
      res.status(response.status).json(data);
    } catch (error) {
      console.error("[PARTIES] Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch parties" });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // ALLOCATE PARTY — for sandbox mode when parties don't exist yet
  // ──────────────────────────────────────────────────────────────
  app.post("/api/canton/allocate-party", checkCantonConfig, async (req, res) => {
    try {
      const adminToken = generateAdminToken();
      const { displayName, identifierHint } = req.body;
      console.log(`[ALLOCATE] Allocating party: ${displayName} (${identifierHint})`);
      const response = await fetch(`${CANTON_API_URL}/v1/parties/allocate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          identifierHint: identifierHint || displayName,
          displayName: displayName
        })
      });
      const data = await response.json();
      console.log("[ALLOCATE] Response:", JSON.stringify(data));
      res.status(response.status).json(data);
    } catch (error) {
      console.error("[ALLOCATE] Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to allocate party" });
    }
  });

  // Health check
  app.get("/api/canton/health", checkCantonConfig, async (req, res) => {
    try {
      const adminToken = generateAdminToken();
      const response = await fetch(`${CANTON_API_URL}/v1/parties`, {
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
      if (response.ok) {
        res.json({ status: "connected", details: await response.json() });
      } else {
        res.status(response.status).json({ status: "error", details: await response.text() });
      }
    } catch (error) {
      res.status(500).json({ status: "disconnected", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // PROXY — Forwards requests to Canton JSON API.
  // Uses resolveAuthHeader() to ensure a valid token is always present.
  // ──────────────────────────────────────────────────────────────

  // Query contracts
  app.post("/api/canton/query", checkCantonConfig, async (req, res) => {
    try {
      const response = await fetch(`${CANTON_API_URL}/v1/query`, {
        method: "POST",
        headers: { 
          "Authorization": await resolveAuthHeaderWithParties(req.headers.authorization as string),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to query Canton" });
    }
  });

  // Create contract
  app.post("/api/canton/create", checkCantonConfig, async (req, res) => {
    const authHeader = await resolveAuthHeaderWithParties(req.headers.authorization as string);
    console.log(`[PROXY] POST ${CANTON_API_URL}/v1/create`);
    console.log(`[PROXY] Body:`, JSON.stringify(req.body));
    console.log(`[PROXY] Auth Header (first 40):`, authHeader.substring(0, 40) + '...');
    
    try {
      const response = await fetch(`${CANTON_API_URL}/v1/create`, {
        method: "POST",
        headers: { 
          "Authorization": authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });
      
      const responseText = await response.text();
      console.log(`[PROXY] Response Status: ${response.status}`);
      console.log(`[PROXY] Response Body:`, responseText.substring(0, 500));
      
      try {
        const data = JSON.parse(responseText);
        res.status(response.status).json(data);
      } catch (e) {
        res.status(response.status).json({ error: "Invalid JSON from Canton", details: responseText });
      }
    } catch (error) {
      console.error("[PROXY] Fetch Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create contract" });
    }
  });

  // Exercise choice
  app.post("/api/canton/exercise", checkCantonConfig, async (req, res) => {
    try {
      const response = await fetch(`${CANTON_API_URL}/v1/exercise`, {
        method: "POST",
        headers: { 
          "Authorization": await resolveAuthHeaderWithParties(req.headers.authorization as string),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to exercise choice" });
    }
  });

  // 404 for unknown API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found", path: req.url });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }


  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
