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

function extractActAs(authHeader: string | undefined): string[] {
  const payload = parseJwtPayload(authHeader);
  if (!payload) return [];

  const ledgerApi = payload['https://daml.com/ledger-api'];
  const candidates = [
    ...(Array.isArray(ledgerApi?.actAs) ? ledgerApi.actAs : []),
    ...(Array.isArray(ledgerApi?.readAs) ? ledgerApi.readAs : []),
    ...(Array.isArray(payload.actAs) ? payload.actAs : []),
    ...(Array.isArray(payload.readAs) ? payload.readAs : []),
    payload.party,
    payload.party_id,
    payload.primaryParty,
    payload.preferred_username,
    payload.sub,
  ];

  return [...new Set(candidates.filter((p: unknown): p is string => typeof p === 'string' && p.length > 0))];
}

function extractPartyHintsFromBody(body: any): string[] {
  const hints = [
    body?.payload?.organizer,
    body?.payload?.artist,
    body?.payload?.public,
    body?.argument?.buyer,
    body?.argument?.newOwner,
  ];

  return [...new Set(hints.filter((p: unknown): p is string => typeof p === 'string' && p.length > 0))];
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

function normalizeContractCandidate(candidate: any): any | null {
  if (!candidate || typeof candidate !== 'object') return null;

  const contractId = candidate.contractId || candidate.contract_id;
  const templateId = normalizeTemplateId(candidate.templateId || candidate.template_id);
  const payload = candidate.payload || candidate.createArguments || candidate.create_arguments;

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

function buildPackageIdCandidates(currentPackageId: string | undefined, discoveredPackageIds: string[]): string[] {
  return [currentPackageId, ...discoveredPackageIds]
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
    const body = req.body || {};

    console.log("=========================================");
    console.log(`>>> BRIDGE HIT: ${req.method} ${action} <<<`);
    console.log("Payload:", JSON.stringify(body));
    console.log("=========================================");

    const baseTarget = 'https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services';
    const clientAuth = req.headers.authorization as string | undefined;

    const hasBearerToken = !!(clientAuth && clientAuth.startsWith('Bearer '));
    const requiresDevnetToken = ['packages', 'upload-dar', 'query', 'create', 'exercise'].includes(action);

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
      return { response, parsed, text, targetPath };
    };

    const templateId = normalizeTemplateId(body.templateId);

    try {
      if (action === 'packages' && req.method === 'GET') {
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

      if (action === 'upload-dar' && req.method === 'POST') {
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

      if (action === 'query' && req.method === 'POST') {
        const actAs = extractActAs(clientAuth);

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

        const queryPayload = actAs.length > 0
          ? {
              filter: {
                filtersByParty: Object.fromEntries(
                  actAs.map((party) => [party, { templateFilters }])
                ),
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
          return res.status(response.status).json({
            errors: [getErrorMessage(parsed, text)],
            status: response.status,
          });
        }

        const contracts = extractContractsDeep(parsed);
        const queryFilter = body.query || {};
        const filtered = contracts.filter((c) => matchesQueryObject(c.payload, queryFilter));

        return res.status(200).json({ status: 200, result: filtered });
      }

      if (action === 'create' && req.method === 'POST') {
        if (!templateId) {
          return res.status(400).json({ errors: ['templateId is required for create.'], status: 400 });
        }

        const actAs = extractActAs(clientAuth);
        const partyHints = extractPartyHintsFromBody(body);
        const commandActAs = actAs.length > 0 ? actAs : partyHints;

        if (commandActAs.length === 0) {
          return res.status(400).json({
            errors: ['Create requires authenticated party context (token actAs or party fields in payload).'],
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
          const commandId = `create-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

          const createPayload = {
            commandId,
            actAs: commandActAs,
            commands: [
              {
                CreateCommand: {
                  templateId: candidateTemplateId,
                  createArguments: body.payload || {},
                },
              },
            ],
          };

          const { response, parsed, text } = await passThrough('/v2/commands/submit-and-wait', {
            method: 'POST',
            headers: {
              'Authorization': relayAuth,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(createPayload),
          }, 25_000);

          if (response.ok) {
            const created = extractContractsDeep(parsed)[0];
            if (!created) {
              return res.status(500).json({
                errors: ['Create succeeded but created contract could not be parsed from response.'],
                status: 500,
              });
            }

            return res.status(200).json({ status: 200, result: created });
          }

          const failureMessage = getErrorMessage(parsed, text);
          lastFailureStatus = response.status;
          lastFailureMessage = failureMessage;

          console.warn(`[BRIDGE] Create failed for package ${candidatePackageId}: ${failureMessage}`);

          if (!isTemplateMissingError(failureMessage)) {
            return res.status(response.status).json({
              errors: [failureMessage],
              status: response.status,
            });
          }
        }

        if (isTemplateMissingError(lastFailureMessage)) {
          return res.status(lastFailureStatus).json({
            errors: ['DevNet participant üzerinde Ticket template görünmüyor. Paket yetkisi/aktivasyonu gerekiyor.'],
            status: lastFailureStatus,
          });
        }

        return res.status(lastFailureStatus).json({
          errors: [lastFailureMessage],
          status: lastFailureStatus,
        });
      }

      if (action === 'exercise' && req.method === 'POST') {
        if (!templateId || !body.contractId || !body.choice) {
          return res.status(400).json({
            errors: ['templateId, contractId and choice are required for exercise.'],
            status: 400,
          });
        }

        const actAs = extractActAs(clientAuth);
        const partyHints = extractPartyHintsFromBody(body);
        const commandActAs = actAs.length > 0 ? actAs : partyHints;

        if (commandActAs.length === 0) {
          return res.status(400).json({
            errors: ['Exercise requires authenticated party context (token actAs or party fields in argument).'],
            status: 400,
          });
        }

        const commandId = `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const exercisePayload = {
          commandId,
          actAs: commandActAs,
          commands: [
            {
              ExerciseCommand: {
                templateId,
                contractId: body.contractId,
                choice: body.choice,
                choiceArgument: body.argument || {},
              },
            },
          ],
        };

        const { response, parsed, text } = await passThrough('/v2/commands/submit-and-wait', {
          method: 'POST',
          headers: {
            'Authorization': relayAuth,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(exercisePayload),
        });

        if (!response.ok) {
          return res.status(response.status).json({
            errors: [getErrorMessage(parsed, text)],
            status: response.status,
          });
        }

        const contracts = extractContractsDeep(parsed);
        const exerciseResult = (parsed as any)?.exerciseResult
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
