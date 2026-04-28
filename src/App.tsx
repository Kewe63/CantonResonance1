/**
 * Canton Ticket Platform — Main Application
 * Production-ready React frontend connected to Canton Ledger via JSON API.
 * 
 * Architecture:
 *   App.tsx (state + routing)
 *   ├── WalletLogin (party auth)
 *   ├── OrganizerPanel (event management)
 *   ├── UserPanel (ticket marketplace)
 *   ├── ArtistPanel (royalty dashboard)
 *   └── LedgerFeed (live protocol feed)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cantonService, type ConnectionStatus } from './services/cantonService';
import type {
  EventContract,
  TicketContract,
  ListingContract,
  RoyaltyContract,
} from './services/damlLedger';

import { ToastProvider, useToast } from './components/Toast';
import { WalletLogin } from './components/WalletLogin';
import { OrganizerPanel } from './components/OrganizerPanel';
import { UserPanel } from './components/UserPanel';
import { ArtistPanel } from './components/ArtistPanel';
import { MarketPanel } from './components/MarketPanel';
import { LedgerFeed } from './components/LedgerFeed';
import { useI18n } from './i18n';

// ─── Types ────────────────────────────────────────────────────

type Role = 'organizer' | 'user' | 'artist' | 'market';

const ROLE_ICONS: Record<Role, string> = {
  organizer: 'bxs-badge-check',
  user: 'bxs-user',
  artist: 'bxs-music',
  market: 'bx-store-alt',
};

function matchesEventHintPayload(payload: EventContract['payload'], eventHint: EventContract['payload']): boolean {
  const nameMatches = payload.name === eventHint.name;
  const dateMatches = payload.date === eventHint.date;
  const venueMatches = payload.venue === eventHint.venue;
  const organizerMatches = String(payload.organizer || '') === String(eventHint.organizer || '');

  if (nameMatches && dateMatches && venueMatches && organizerMatches) return true;
  const strongMatchCount = [nameMatches, dateMatches, venueMatches].filter(Boolean).length;
  return strongMatchCount >= 2;
}

// ─── Inner App (needs Toast context) ──────────────────────────

function AppInner() {
  const [role, setRole] = useState<Role>('organizer');
  const [isDark, setIsDark] = useState(true);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('disconnected');
  const [connError, setConnError] = useState<string | null>(null);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Contract state
  const [events, setEvents] = useState<EventContract[]>([]);
  const [tickets, setTickets] = useState<TicketContract[]>([]);
  const [listings, setListings] = useState<ListingContract[]>([]);
  const [receipts, setReceipts] = useState<RoyaltyContract[]>([]);

  const streamCleanup = useRef<(() => void) | null>(null);
  const stickyCreatedEventsRef = useRef<Map<string, EventContract>>(new Map());
  const connectInFlightRef = useRef(false);
  const createInFlightRef = useRef(false);
  const { showToast } = useToast();
  const { t, lang, setLang } = useI18n();

  const ROLE_META: Record<Role, { label: string; icon: string }> = {
    organizer: { label: t('role.organizer'), icon: ROLE_ICONS.organizer },
    user: { label: t('role.user'), icon: ROLE_ICONS.user },
    artist: { label: t('role.artist'), icon: ROLE_ICONS.artist },
    market: { label: t('role.market'), icon: ROLE_ICONS.market },
  };

  // ─── Theme ─────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // ─── Subscribe to connection state ─────────────────────────
  useEffect(() => {
    const unsub = cantonService.subscribe((s) => {
      setConnStatus(s.status);
      setConnError(s.error);
      setPartyId(s.partyId);
      setUserId(s.userId);
    });
    return unsub;
  }, []);

  const archivedContractIdsRef = useRef<Set<string>>(new Set(
    JSON.parse(localStorage.getItem('archivedContractIds') || '[]')
  ));

  const addArchivedContract = useCallback((cid: string) => {
    archivedContractIdsRef.current.add(cid);
    try {
      const arr = Array.from(archivedContractIdsRef.current);
      if (arr.length > 100) arr.splice(0, arr.length - 100);
      localStorage.setItem('archivedContractIds', JSON.stringify(arr));
    } catch {}
  }, []);

  const mergeWithStickyEvents = useCallback((incomingEvents: EventContract[]) => {
    const stickyMap = stickyCreatedEventsRef.current;

    const realIncomingEvents = incomingEvents.filter(
      (event) => !String(event.contractId).startsWith('unparsed-') && !archivedContractIdsRef.current.has(event.contractId)
    );
    
    // Deduplicate by contractId only
    const byContractId = new Map<string, EventContract>();
    realIncomingEvents.forEach(event => {
      byContractId.set(event.contractId, event);
    });
    const finalIncomingEvents = Array.from(byContractId.values());
    const incomingIds = new Set(finalIncomingEvents.map(e => e.contractId));

    const now = Date.now();
    for (const [stickyId, stickyEvent] of stickyMap.entries()) {
      if (!stickyEvent?.payload) {
        stickyMap.delete(stickyId);
        continue;
      }

      if (incomingIds.has(stickyEvent.contractId)) {
        stickyMap.delete(stickyId);
        continue;
      }
      
      const age = now - ((stickyEvent as any)._stickyTimestamp || 0);
      if (age > 30_000) {
        stickyMap.delete(stickyId);
      }
    }

    const stickyValues = Array.from(stickyMap.values()) as EventContract[];
    const stickyOnly = stickyValues.filter(event => !incomingIds.has(event.contractId) && !archivedContractIdsRef.current.has(event.contractId));

    return [...finalIncomingEvents, ...stickyOnly];
  }, []);

  // ─── Data fetching ─────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [ev, tk, ls, rc] = await Promise.all([
        cantonService.getEvents(),
        cantonService.getTickets(),
        cantonService.getListings(),
        cantonService.getRoyaltyReceipts(),
      ]);

      setEvents(mergeWithStickyEvents(ev));
      
      const realTickets = tk.filter(t => !archivedContractIdsRef.current.has(t.contractId));
      setTickets(realTickets);

      const realListings = ls.filter(l => !archivedContractIdsRef.current.has(l.contractId));
      setListings(realListings);

      setReceipts(rc);
    } catch (err) {
      console.warn('Fetch failed, using offline state', err);
    }
  }, [mergeWithStickyEvents]);

  // Fetch on connect
  useEffect(() => {
    if (connStatus === 'connected') {
      fetchAll();
      // Start streaming
      streamCleanup.current = cantonService.streamAll((data) => {
        setEvents(mergeWithStickyEvents(data.events));
        setTickets(data.tickets);
        setListings(data.listings);
        setReceipts(data.receipts);
      });
    }
    return () => {
      streamCleanup.current?.();
      streamCleanup.current = null;
    };
  }, [connStatus, fetchAll, mergeWithStickyEvents]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleConnect = async (uid: string) => {
    if (connectInFlightRef.current) return;
    connectInFlightRef.current = true;

    try {
      const ok = await cantonService.connect(uid);
      if (ok) {
        showToast('⚡', 'Bağlantı Kuruldu', `Canton Ledger'a ${uid} olarak bağlandınız`);
      } else {
        const s = cantonService.getState();
        showToast('❌', 'Bağlantı Hatası', s.error || 'Bilinmeyen hata', 'error');
      }
    } finally {
      connectInFlightRef.current = false;
    }
  };

  const handleDisconnect = () => {
    cantonService.disconnect();
    stickyCreatedEventsRef.current.clear();
    setEvents([]);
    setTickets([]);
    setListings([]);
    setReceipts([]);
    showToast('🔌', 'Bağlantı Kesildi', 'Canton oturumu sonlandırıldı', 'warning');
  };

  // Event creation
  const handleCreateEvent = async (payload: {
    name: string; date: string; venue: string;
    totalTickets: number; price: number; royaltyPct: number;
    maxResaleMultiplier: number | null;
  }) => {
    if (createInFlightRef.current) return;
    createInFlightRef.current = true;

    try {
      const created = await cantonService.createEvent({
        ...payload,
        artist: 'ArtistParty',
        public: 'Public',
      });

      if (created && typeof created === 'object' && 'contractId' in created && 'payload' in created) {
        const createdEvent = created as EventContract;
        stickyCreatedEventsRef.current.set(createdEvent.contractId, createdEvent);
        setEvents((prev) => [
          createdEvent,
          ...prev.filter((event) => event.contractId !== createdEvent.contractId),
        ]);
      }

      showToast('🎉', t('toast.eventCreated'), `"${payload.name}" ${t('toast.eventCreatedDetail')}`);
      await fetchAll();
    } finally {
      createInFlightRef.current = false;
    }
  };

  const handleCancelEvent = async (cid: string) => {
    await cantonService.cancelEvent(cid);
    addArchivedContract(cid);
    showToast('🗑️', t('toast.eventCancelled'), t('toast.eventCancelledDetail'));
    await fetchAll();
  };

  const handleBuyTicket = async (eventCid: string, seat: string, eventHint?: EventContract['payload']) => {
    const buyById = async (cid: string) => cantonService.buyTicket(cid, seat, eventHint);

    let usedEventCid = eventCid;
    let createdTicketContractId: string | null = null;
    let bridgeCreatedEvent: EventContract | null = null;
    let bridgeCreatedTicket: TicketContract | null = null;

    const applyBuyOutcome = (outcome: Awaited<ReturnType<typeof cantonService.buyTicket>> | null | undefined) => {
      if (!outcome) return;

      if (outcome.nextEventContractId) {
        usedEventCid = outcome.nextEventContractId;
      }

      if (outcome.createdTicketContractId) {
        createdTicketContractId = outcome.createdTicketContractId;
      }

      if (outcome.createdEvent) {
        bridgeCreatedEvent = outcome.createdEvent;
        usedEventCid = outcome.createdEvent.contractId;
      }

      if (outcome.createdTicket) {
        bridgeCreatedTicket = outcome.createdTicket;
        createdTicketContractId = outcome.createdTicket.contractId;
      }
    };

    try {
      applyBuyOutcome(await buyById(eventCid));
    } catch (err: any) {
      const rawMessage = String(err?.message || err || '');
      const missingContract = rawMessage.toLowerCase().includes('contract could not be found with id');

      const latestEvents = await cantonService.getEvents();
      const freshByHint = eventHint
        ? latestEvents.find((event) => matchesEventHintPayload(event.payload, eventHint))
        : undefined;

      if (!freshByHint) {
        if (!String(eventCid).startsWith('unparsed-') && !missingContract) throw err;
      } else {
        usedEventCid = freshByHint.contractId;

        setEvents((prev) => {
          const withoutOld = prev.filter((event) => event.contractId !== eventCid && event.contractId !== freshByHint.contractId);
          return [freshByHint, ...withoutOld];
        });

        try {
          applyBuyOutcome(await buyById(freshByHint.contractId));
        } catch (retryErr) {
          const retryMessage = String((retryErr as any)?.message || retryErr || '').toLowerCase();
          if (!retryMessage.includes('contract could not be found with id')) throw retryErr;

          let finalRetryError = retryErr;
          for (const retryDelay of [1200, 2200, 3000]) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            const refreshed = await cantonService.getEvents();
            const newest = eventHint
              ? refreshed.find((event) => matchesEventHintPayload(event.payload, eventHint))
              : undefined;
            if (!newest) continue;

            try {
              usedEventCid = newest.contractId;
              applyBuyOutcome(await buyById(newest.contractId));
              finalRetryError = null;
              break;
            } catch (loopErr) {
              finalRetryError = loopErr;
            }
          }

          if (finalRetryError) throw finalRetryError;
        }
      }
    }

    addArchivedContract(eventCid);
    stickyCreatedEventsRef.current.delete(eventCid);

    if (bridgeCreatedEvent) {
      const createdEvent = { ...bridgeCreatedEvent } as EventContract;
      (createdEvent as any)._stickyTimestamp = Date.now();
      stickyCreatedEventsRef.current.set(createdEvent.contractId, createdEvent);
      setEvents((prev) => mergeWithStickyEvents([
        createdEvent,
        ...prev.filter((event) => event.contractId !== eventCid && event.contractId !== createdEvent.contractId),
      ]));
    }

    if (bridgeCreatedTicket) {
      const createdTicket = bridgeCreatedTicket;
      setTickets((prev) => [
        createdTicket,
        ...prev.filter((ticket) => ticket.contractId !== createdTicket.contractId),
      ]);
    } else if (createdTicketContractId && eventHint) {
      const syntheticTicket: TicketContract = {
        contractId: createdTicketContractId,
        templateId: '',
        payload: {
          owner: partyId || '',
          organizer: String(eventHint.organizer || ''),
          artist: String(eventHint.artist || ''),
          public: String(eventHint.public || ''),
          eventName: eventHint.name,
          eventDate: eventHint.date,
          eventVenue: eventHint.venue,
          seat,
          originalPrice: String(eventHint.price),
          currentPrice: String(eventHint.price),
          royaltyPct: String(eventHint.royaltyPct),
          maxResaleMultiplier: eventHint.maxResaleMultiplier === null ? null : String(eventHint.maxResaleMultiplier),
          isUsed: false,
          transferCount: 0,
        },
        signatories: [],
        observers: [],
      };

      bridgeCreatedTicket = syntheticTicket;
      setTickets((prev) => [
        syntheticTicket,
        ...prev.filter((ticket) => ticket.contractId !== syntheticTicket.contractId),
      ]);
    }

    if (bridgeCreatedEvent && bridgeCreatedTicket) {
      window.setTimeout(() => {
        fetchAll().catch(() => undefined);
      }, 1500);
      return;
    }

    for (let attempt = 0; attempt < 8; attempt++) {
      const [latestEvents, latestTickets] = await Promise.all([
        cantonService.getEvents(),
        cantonService.getTickets(),
      ]);

      const refreshedEvent = latestEvents.find((event) => event.contractId === usedEventCid)
        || (eventHint ? latestEvents.find((event) => matchesEventHintPayload(event.payload, eventHint)) : undefined);

      if (refreshedEvent) {
        usedEventCid = refreshedEvent.contractId;
      }

      setEvents(mergeWithStickyEvents(latestEvents));

      const mergedTickets = bridgeCreatedTicket
        ? [
            bridgeCreatedTicket,
            ...latestTickets.filter((ticket) => ticket.contractId !== bridgeCreatedTicket!.contractId),
          ]
        : latestTickets;
      setTickets(mergedTickets);

      const boughtVisibleByContractId = createdTicketContractId
        ? mergedTickets.some((ticket) => ticket.contractId === createdTicketContractId)
        : false;

      const boughtVisibleBySeat = mergedTickets.some((ticket) => {
        const sameSeat = ticket.payload.seat === seat;
        const sameEvent = eventHint ? ticket.payload.eventName === eventHint.name : true;
        return sameSeat && sameEvent;
      });

      const boughtVisible = boughtVisibleByContractId || boughtVisibleBySeat;

      const counterAdvanced = refreshedEvent
        ? (eventHint
          ? Number(refreshedEvent.payload.ticketsSold) > Number(eventHint.ticketsSold)
          : true)
        : false;

      if (boughtVisible && (counterAdvanced || !!bridgeCreatedEvent)) {
        window.setTimeout(() => {
          fetchAll().catch(() => undefined);
        }, 1200);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 700));
    }

    await fetchAll();
    throw new Error('İşlem ledger üzerinde henüz doğrulanmadı. Bilet cüzdana düşmediyse birkaç saniye sonra tekrar deneyin.');
  };

  const handleListForSale = async (ticketCid: string, price: number) => {
    await cantonService.listForSale(ticketCid, price);
    addArchivedContract(ticketCid);
    setTickets(prev => prev.filter(t => t.contractId !== ticketCid));
    await fetchAll();
  };

  const handleBuySecondary = async (listingCid: string) => {
    await cantonService.buySecondary(listingCid);
    addArchivedContract(listingCid);
    await fetchAll();
  };

  const handleCancelListing = async (listingCid: string) => {
    await cantonService.cancelListing(listingCid);
    addArchivedContract(listingCid);
    await fetchAll();
  };

  const handleUseTicket = async (ticketCid: string) => {
    await cantonService.useTicket(ticketCid);
    addArchivedContract(ticketCid);
    showToast('✅', t('toast.ticketUsed'), t('toast.ticketUsedDetail'));
    await fetchAll();
  };

  // ─── Render ────────────────────────────────────────────────
  const isLoggedIn = connStatus === 'connected';

  return (
    <div className="min-h-screen selection:bg-accent selection:text-black">
      <div className="noise fixed inset-0 z-50 pointer-events-none" />

      {/* Connection error toast */}
      {connError && connStatus !== 'connected' && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm glass-card border-red-500/50 p-4">
          <div className="flex gap-3">
            <i className='bx bx-error-circle text-red-500 text-xl shrink-0'></i>
            <div>
              <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{t('nav.connectionRequired')}</p>
              <p className="text-[10px] text-text-muted mt-1 leading-relaxed">{connError}</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Navigation ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4 md:justify-between">
          {/* Logo */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-accent rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(200,240,90,0.3)] transition-transform group-hover:scale-110">
                <i className='bx bxs-zap text-xl md:text-2xl'></i>
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-extrabold leading-none uppercase tracking-tighter">CANTON</h1>
                <p className="text-[8px] md:text-[10px] text-accent font-bold tracking-[0.2em] uppercase">Resonance 2.0</p>
              </div>
            </div>

            <button
              onClick={() => setIsDark(!isDark)}
              className="md:hidden w-10 h-10 flex items-center justify-center bg-surface border border-border rounded-xl text-text-main"
            >
              <i className={`bx ${isDark ? 'bx-sun' : 'bx-moon'} text-xl`}></i>
            </button>
          </div>

          {/* Role Tabs — only when logged in */}
          {isLoggedIn && (
            <div className="flex bg-bg p-1 rounded-xl border border-border shadow-inner overflow-x-auto max-w-full no-scrollbar">
              <div className="flex min-w-max gap-1">
                {(Object.keys(ROLE_META) as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      role === r
                        ? 'bg-accent text-black shadow-lg scale-100'
                        : 'text-text-muted hover:text-text-main scale-95'
                    }`}
                  >
                    <i className={`bx ${ROLE_META[r].icon} text-xs`}></i>
                    {ROLE_META[r].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Right: Theme + Wallet */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
              className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-surface-hover border border-border rounded-xl text-text-main transition-colors text-xs font-bold"
              title={lang === 'tr' ? 'Switch to English' : 'Türkçeye Geç'}
            >
              {lang === 'tr' ? 'EN' : 'TR'}
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-surface-hover border border-border rounded-xl text-text-main transition-colors"
            >
              <i className={`bx ${isDark ? 'bx-sun' : 'bx-moon'} text-xl`}></i>
            </button>
            {isLoggedIn ? (
              <div className="flex items-center gap-3 pl-3 border-l border-border">
                <div className="text-right">
                  <p className="text-[8px] font-bold text-text-muted uppercase tracking-widest">{t('nav.activeIdentity')}</p>
                  <p className="text-xs font-mono font-bold text-accent truncate max-w-[140px]">{partyId || t('nav.connecting')}</p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="w-8 h-8 flex items-center justify-center bg-surface-hover hover:bg-bg border border-border rounded-lg text-red-500 transition-colors"
                  title={t('nav.disconnect')}
                >
                  <i className='bx bx-log-out text-base'></i>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg">
                <div className="w-2 h-2 bg-text-muted rounded-full" />
                <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-tight">{t('nav.noConnection')}</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ Main Content ═══ */}
      <main className="pt-36 md:pt-28 pb-20 px-4 md:px-6 max-w-7xl mx-auto">
        {!isLoggedIn ? (
          <WalletLogin
            onConnect={handleConnect}
            isConnecting={connStatus === 'connecting'}
            connectionError={connError}
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Role Panel */}
              <div className="lg:col-span-8 space-y-8">
                {role === 'organizer' && (
                  <OrganizerPanel
                    events={events}
                    onCreateEvent={handleCreateEvent}
                    onCancelEvent={handleCancelEvent}
                    partyId={partyId || ''}
                  />
                )}
                {role === 'user' && (
                  <UserPanel
                    events={events}
                    tickets={tickets}
                    listings={listings}
                    partyId={partyId || ''}
                    onBuyTicket={handleBuyTicket}
                    onListForSale={handleListForSale}
                    onBuySecondary={handleBuySecondary}
                    onCancelListing={handleCancelListing}
                    onUseTicket={handleUseTicket}
                  />
                )}
                {role === 'artist' && (
                  <ArtistPanel
                    events={events}
                    receipts={receipts}
                    partyId={partyId || ''}
                  />
                )}
                {role === 'market' && (
                  <MarketPanel
                    events={events}
                    listings={listings}
                    partyId={partyId || ''}
                    onBuyTicket={handleBuyTicket}
                    onBuySecondary={handleBuySecondary}
                  />
                )}
              </div>

              {/* Right Column: Live Feed + Stats */}
              <div className="lg:col-span-4 space-y-6">
                <LedgerFeed
                  events={events}
                  tickets={tickets}
                  receipts={receipts}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Mobile wallet info bar */}
      {isLoggedIn && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg/90 backdrop-blur-xl border-t border-border px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Bağlı</p>
            <p className="text-[10px] font-mono font-bold text-accent truncate max-w-[180px]">{partyId}</p>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10"
          >
            Çıkış
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Root Export (wraps with Toast provider) ──────────────────

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
