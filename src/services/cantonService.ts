/**
 * Canton Network Service — Full API for App.tsx
 * Bridges authService + damlLedger to provide connect/disconnect/subscribe
 * and all contract operations the UI needs.
 * Supports both Sandbox and DevNet modes.
 */

import {
  createLedgerClient,
  type EventContract,
  type TicketContract,
  type ListingContract,
  type RoyaltyContract,
} from './damlLedger';

import { authService } from './authService';

// ─── Types ────────────────────────────────────────────────────
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface CantonState {
  status: ConnectionStatus;
  error: string | null;
  partyId: string | null;
  userId: string | null;
}

type Listener = (state: CantonState) => void;

// ─── State ────────────────────────────────────────────────────
let state: CantonState = {
  status: 'disconnected',
  error: null,
  partyId: null,
  userId: null,
};

let ledgerClient: Awaited<ReturnType<typeof createLedgerClient>> | null = null;
const listeners: Set<Listener> = new Set();

function notify() {
  listeners.forEach((fn) => fn({ ...state }));
}

function setState(patch: Partial<CantonState>) {
  state = { ...state, ...patch };
  notify();
}

// ─── Service ──────────────────────────────────────────────────
export const cantonService = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener({ ...state });
    return () => listeners.delete(listener);
  },

  getState(): CantonState {
    return { ...state };
  },

  /**
   * Connect to sandbox as a specific party (by display name).
   * Fetches real party IDs from the running sandbox.
   */
  async connectSandbox(displayName: string): Promise<boolean> {
    setState({ status: 'connecting', error: null });
    try {
      const partyId = await authService.loginToSandbox(displayName);
      ledgerClient = await createLedgerClient(partyId);
      setState({ status: 'connected', error: null, partyId, userId: displayName });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setState({ status: 'disconnected', error: msg });
      return false;
    }
  },

  /**
   * Connect using a raw party ID (from Keycloak or manual input).
   */
  async connect(userId: string): Promise<boolean> {
    setState({ status: 'connecting', error: null });
    try {
      const partyId = userId;
      if (!partyId) {
        setState({ status: 'disconnected', error: 'Party ID bulunamadı.' });
        return false;
      }
      ledgerClient = await createLedgerClient(partyId);
      setState({ status: 'connected', error: null, partyId, userId });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setState({ status: 'disconnected', error: msg });
      return false;
    }
  },

  disconnect() {
    ledgerClient = null;
    authService.logout();
    setState({ status: 'disconnected', error: null, partyId: null, userId: null });
  },

  // ─── Contract Queries ───────────────────────────────────────

  async getEvents(): Promise<EventContract[]> {
    if (!ledgerClient) return [];
    try {
      return await ledgerClient.query<EventContract['payload']>('Event');
    } catch (err) {
      console.warn('getEvents failed:', err);
      return [];
    }
  },

  async getTickets(): Promise<TicketContract[]> {
    if (!ledgerClient) return [];
    try {
      return await ledgerClient.query<TicketContract['payload']>('UserTicket');
    } catch (err) {
      console.warn('getTickets failed:', err);
      return [];
    }
  },

  async getListings(): Promise<ListingContract[]> {
    if (!ledgerClient) return [];
    try {
      return await ledgerClient.query<ListingContract['payload']>('SecondaryListing');
    } catch (err) {
      console.warn('getListings failed:', err);
      return [];
    }
  },

  async getRoyaltyReceipts(): Promise<RoyaltyContract[]> {
    if (!ledgerClient) return [];
    try {
      return await ledgerClient.query<RoyaltyContract['payload']>('RoyaltyReceipt');
    } catch (err) {
      console.warn('getRoyaltyReceipts failed:', err);
      return [];
    }
  },

  // ─── Contract Actions ───────────────────────────────────────

  async createEvent(params: {
    name: string;
    date: string;
    venue: string;
    totalTickets: number;
    price: number;
    royaltyPct: number;
    maxResaleMultiplier: number | null;
    artist: string;
    public: string;
  }) {
    if (!ledgerClient || !state.partyId) throw new Error('Not connected');

    // In sandbox single-party mode, use the logged-in party for all roles
    const artistParty = state.partyId;
    const publicParty = state.partyId;

    if (!state.partyId) throw new Error("Cüzdan bağlı değil (Party ID eksik)");

    return ledgerClient.create('Event', {
      organizer: state.partyId,
      artist: artistParty,
      public: publicParty,
      name: params.name,
      date: params.date,
      venue: params.venue,
      totalTickets: Number(params.totalTickets), // Force as number for Int
      price: parseFloat(params.price.toString()).toFixed(1), // Force as string with .0 for Decimal
      royaltyPct: parseFloat(params.royaltyPct.toString()).toFixed(1),
      ticketsSold: 0, // Force as number for Int
      maxResaleMultiplier: params.maxResaleMultiplier !== null ? parseFloat(params.maxResaleMultiplier.toString()).toFixed(1) : null,
      isCancelled: false,
    });
  },

  async cancelEvent(contractId: string) {
    if (!ledgerClient) throw new Error('Not connected');
    return ledgerClient.exercise('Event', contractId, 'CancelEvent', {});
  },

  async buyTicket(eventContractId: string, seat: string) {
    if (!ledgerClient || !state.partyId) throw new Error('Not connected');
    return ledgerClient.exercise('Event', eventContractId, 'BuyTicket', {
      buyer: state.partyId,
      seat,
    });
  },

  async listForSale(ticketContractId: string, sellPrice: number) {
    if (!ledgerClient) throw new Error('Not connected');
    return ledgerClient.exercise('UserTicket', ticketContractId, 'ListForSale', {
      sellPrice: sellPrice.toString(),
    });
  },

  async buySecondary(listingContractId: string) {
    if (!ledgerClient || !state.partyId) throw new Error('Not connected');
    return ledgerClient.exercise('SecondaryListing', listingContractId, 'BuySecondary', {
      newOwner: state.partyId,
    });
  },

  async cancelListing(listingContractId: string) {
    if (!ledgerClient) throw new Error('Not connected');
    return ledgerClient.exercise('SecondaryListing', listingContractId, 'CancelListing', {});
  },

  async useTicket(ticketContractId: string) {
    if (!ledgerClient) throw new Error('Not connected');
    return ledgerClient.exercise('UserTicket', ticketContractId, 'UseTicket', {});
  },

  // ─── Streaming ──────────────────────────────────────────────

  streamAll(
    onData: (data: {
      events: EventContract[];
      tickets: TicketContract[];
      listings: ListingContract[];
      receipts: RoyaltyContract[];
    }) => void
  ): () => void {
    let running = true;

    const poll = async () => {
      while (running) {
        try {
          const [events, tickets, listings, receipts] = await Promise.all([
            cantonService.getEvents(),
            cantonService.getTickets(),
            cantonService.getListings(),
            cantonService.getRoyaltyReceipts(),
          ]);
          if (running) {
            onData({ events, tickets, listings, receipts });
          }
        } catch {
          // silently retry
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    };

    poll();

    return () => {
      running = false;
    };
  },
};
