/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cantonService } from './services/cantonService';
import { DynamicLighting } from './components/DynamicLighting';

// --- Types ---

type Role = 'organizer' | 'user' | 'artist';

interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  price: number;
  royalty: number;
  ticketsLeft: number;
  totalTickets: number;
  signatories: string[];
  observers: string[];
}

interface UserTicket {
  id: string;
  eventId: string;
  eventName: string;
  purchasePrice: number;
  status: 'active' | 'selling';
  contractId: string;
}

interface Transaction {
  id: string;
  type: 'primary' | 'secondary' | 'create';
  item: string;
  amount: number;
  royaltyEarned: number;
  time: string;
  choice?: string;
}

// --- Initial Data ---

const INITIAL_EVENTS: Event[] = [
  { id: '1', name: 'Zorlu PSM: Technobloom', date: '2025-06-15', venue: 'Zorlu PSM Main Stage', price: 65, royalty: 12, ticketsLeft: 12, totalTickets: 500, signatories: ['OrganizerParty'], observers: ['Public'] },
  { id: '2', name: 'Ankara Jazz Series', date: '2025-07-22', venue: 'CerModern', price: 45, royalty: 10, ticketsLeft: 85, totalTickets: 250, signatories: ['OrganizerParty'], observers: ['Public'] },
  { id: '3', name: 'Antalya Summer Beats', date: '2025-08-10', venue: 'Aspendos Amphitheatre', price: 80, royalty: 15, ticketsLeft: 0, totalTickets: 1200, signatories: ['OrganizerParty'], observers: ['Public'] },
];

const INITIAL_TXS: Transaction[] = [
  { id: 'tx-1', type: 'secondary', item: 'Ticket #042', amount: 95, royaltyEarned: 11.4, time: '2m ago', choice: 'Exercise Purchase_Secondary' },
  { id: 'tx-2', type: 'primary', item: 'Ticket #881', amount: 65, royaltyEarned: 7.8, time: '12m ago', choice: 'Exercise Purchase_Primary' },
  { id: 'tx-3', type: 'secondary', item: 'Ticket #102', amount: 110, royaltyEarned: 13.2, time: '45m ago', choice: 'Exercise Purchase_Secondary' },
];

// --- Utilities ---

const formatCurrency = (val: number) => `$${val.toLocaleString()}`;

// --- Components ---

const Badge = ({ children, color = 'accent' }: { children: React.ReactNode, color?: 'accent' | 'purple' | 'red' }) => {
  const colors = {
    accent: 'bg-accent/10 text-accent border-accent/20',
    purple: 'bg-accent-purple/10 text-accent-purple border-accent-purple/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/20'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[color]}`}>
      {children}
    </span>
  );
};

export default function App() {
  const [role, setRole] = useState<Role>('organizer');
  const [events, setEvents] = useState<Event[]>([]);
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [artistBalance, setArtistBalance] = useState(0);
  const [claimedBalance, setClaimedBalance] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Initial Data Fetch from Canton Ledger
  useEffect(() => {
    const fetchData = async () => {
      try {
        const health = await cantonService.getHealth();
        if (health.error || health.status === "error") {
          setConfigError(health.details || "Ledger configuration missing.");
          // Fallback visuals for demo if no real network is connected yet
          setEvents(INITIAL_EVENTS);
          setTransactions(INITIAL_TXS);
          return;
        }

        // Real fetch of contracts (Events and Tickets)
        const contracts = await cantonService.queryContracts(['Project.Event', 'Project.Ticket']);
        if (contracts.result) {
          const fetchedEvents: Event[] = contracts.result
            .filter((c: any) => c.templateId === 'Project.Event')
            .map((c: any) => ({ ...c.payload, contractId: c.contractId }));
          
          const fetchedTickets: UserTicket[] = contracts.result
            .filter((c: any) => c.templateId === 'Project.Ticket')
            .map((c: any) => ({ ...c.payload, contractId: c.contractId }));

          setEvents(fetchedEvents.length > 0 ? fetchedEvents : INITIAL_EVENTS);
          setUserTickets(fetchedTickets);
        }
      } catch (err) {
        console.error("Ledger Connection Failed", err);
        setConfigError("Network Error: Could not connect to Canton API.");
        setEvents(INITIAL_EVENTS);
      }
    };

    fetchData();
  }, []);

  // Stats derivation
  const totalSecondarySales = useMemo(() => transactions.filter(t => t.type === 'secondary').length, [transactions]);
  const totalRoyaltyGenerated = useMemo(() => transactions.reduce((acc, t) => acc + t.royaltyEarned, 0), [transactions]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const addToast = (msg: string) => {
    // Simple console log for demo or we could implement a full toast sys
    console.log(msg);
  };

  const handleBuyTicket = async (event: Event) => {
    if (event.ticketsLeft <= 0) return;
    
    addToast("Executing Purchase Choice on Ledger...");
    
    try {
      const res = await cantonService.exerciseChoice(
        'Project.Event', 
        (event as any).contractId || event.id, 
        'Purchase_Primary', 
        { buyer: 'UserParty' }
      );

      if (res.error) throw new Error(res.error);

      addToast("Successfully synchronized with Canton.");
      // In a real app, we'd wait for the ledger push, but for immediate UX:
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: 'primary',
        item: `${event.name}`,
        amount: event.price,
        royaltyEarned: (event.price * event.royalty) / 100,
        time: 'Just now',
        choice: 'Exercise Purchase_Primary'
      };
      setTransactions([newTx, ...transactions]);
    } catch (err) {
      addToast(`Canton Error: ${err instanceof Error ? err.message : 'Transaction Rejected'}`);
    }
  };

  const handleListTicket = async (ticket: UserTicket, price: number) => {
    addToast("Executing List Choice on Ledger...");
    try {
      const res = await cantonService.exerciseChoice(
        'Project.Ticket',
        ticket.contractId,
        'Offer_For_Secondary',
        { price }
      );
      if (res.error) throw new Error(res.error);
      addToast(`Sale proposal active on network CID: ${ticket.contractId}`);
    } catch (err) {
      addToast(`Operation failed: ${err instanceof Error ? err.message : 'Unknown Error'}`);
    }
  };

  return (
    <div className="min-h-screen selection:bg-accent selection:text-black">
      <div className="noise fixed inset-0 z-50 pointer-events-none" />

      {/* Config Warning Box */}
      {configError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm glass-card border-red-500/50 p-4 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex gap-3">
            <i className='bx bx-error-circle text-red-500 text-xl'></i>
            <div>
              <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Connection Required</p>
              <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                To move beyond simulation, add <code>CANTON_JSON_API_URL</code> and <code>CANTON_JWT_TOKEN</code> to your Secrets.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-border px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4 md:justify-between">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-accent rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(200,240,90,0.3)] transition-transform group-hover:scale-110">
                <i className='bx bxs-zap text-xl md:text-2xl'></i>
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-extrabold leading-none uppercase tracking-tighter">CANTON</h1>
                <p className="text-[8px] md:text-[10px] text-accent font-bold tracking-[0.2em] uppercase">Resonance 1.0</p>
              </div>
            </div>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="md:hidden w-10 h-10 flex items-center justify-center bg-surface border border-border rounded-xl text-text-main"
            >
              <i className={`bx ${isDarkMode ? 'bx-sun' : 'bx-moon'} text-xl`}></i>
            </button>
          </div>

          <div className="flex bg-bg p-1 rounded-xl border border-border shadow-inner overflow-x-auto max-w-full no-scrollbar">
            <div className="flex min-w-max gap-1">
              {(['organizer', 'user', 'artist'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${
                    role === r 
                    ? 'bg-accent text-black shadow-lg scale-100' 
                    : 'text-text-muted hover:text-text-main scale-95'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-surface-hover border border-border rounded-xl text-text-main transition-colors"
            >
              <i className={`bx ${isDarkMode ? 'bx-sun' : 'bx-moon'} text-xl`}></i>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-tight">Sync Online</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-36 md:pt-28 pb-20 px-4 md:px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Column: View Specific Content */}
            <div className="lg:col-span-8 space-y-8">
              {role === 'organizer' && (
                <OrganizerView events={events} onAddEvent={(e) => setEvents([...events, e])} />
              )}
              {role === 'user' && (
                <UserView 
                  events={events} 
                  tickets={userTickets} 
                  onBuy={handleBuyTicket} 
                  onSell={handleListTicket} 
                />
              )}
              {role === 'artist' && (
                <ArtistView 
                  balance={artistBalance} 
                  claimed={claimedBalance} 
                  onClaim={() => {
                    setClaimedBalance(prev => prev + artistBalance);
                    setArtistBalance(0);
                  }}
                />
              )}
            </div>

            {/* Right Column: Shared Ledger & Global Stats */}
            <div className="lg:col-span-4 space-y-8">
              <LedgerFeed transactions={transactions} />
              <GlobalStats 
                secondarySales={totalSecondarySales} 
                totalRoyalty={totalRoyaltyGenerated} 
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-Views ---

const OrganizerView = ({ events, onAddEvent }: { events: Event[], onAddEvent: (e: Event) => void }) => {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
            Your Protocol <i className='bx bxs-badge-check text-accent'></i>
          </h2>
          <p className="text-text-muted text-sm">Control the primary supply and enforce royalty standards.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center justify-center gap-2 group w-full sm:w-auto"
        >
          <i className={`bx ${showForm ? 'bx-minus' : 'bx-plus'} text-lg transition-transform group-hover:rotate-90`}></i>
          Create Event
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-card p-6 overflow-hidden"
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <i className='bx bx-cube text-accent-purple'></i> Event Deployment details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Event Name</label>
                <input className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-sm focus:border-accent outline-none font-mono" placeholder="SONIC RESONANCE" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Base Royalty (%)</label>
                <input type="number" className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-sm focus:border-accent outline-none font-mono" placeholder="15" />
              </div>
              <button 
                onClick={() => {
                  onAddEvent({
                    id: String(Date.now()),
                    name: 'NEW PROTOCOL: ALPHA',
                    date: '2025-12-01',
                    venue: 'DIGITAL VOID',
                    price: 40,
                    royalty: 15,
                    ticketsLeft: 100,
                    totalTickets: 100,
                    signatories: ['OrganizerParty'],
                    observers: ['Public']
                  });
                  setShowForm(false);
                }}
                className="col-span-2 btn-primary bg-accent-purple text-white hover:opacity-90 flex items-center justify-center gap-2"
              >
                <i className='bx bxs-rocket'></i> Deploy to Network
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((event) => (
          <DynamicLighting key={event.id} intensity={0.1}>
            <div className="glass-card p-5 group hover:border-accent/40 transition-colors h-full">
              <div className="space-y-4">
                <div className="flex justify-between items-start mb-4">
                  <Badge>{event.royalty}% ROYALTY</Badge>
                  <div className="text-right">
                    <p className="text-[10px] font-mono text-text-muted">{event.date}</p>
                    <p className="text-xs font-bold text-accent">{formatCurrency(event.price)}</p>
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-1 truncate">{event.name}</h3>
                <p className="text-[10px] text-text-muted mb-4 flex items-center gap-1 uppercase tracking-tighter">
                  <i className='bx bx-map-pin text-accent'></i> {event.venue}
                </p>
                
                <div className="p-3 bg-bg border border-border rounded-xl space-y-2 mb-4">
                  <div className="flex justify-between text-[8px] font-mono text-text-muted">
                    <span>Signatory:</span>
                    <span className="text-accent">{event.signatories[0]}</span>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-text-muted">
                    <span>Observers:</span>
                    <span>{event.observers.join(', ')}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                  <span>Supply Allocation</span>
                  <span className={event.ticketsLeft === 0 ? 'text-red-500' : 'text-accent'}>
                    {event.ticketsLeft} / {event.totalTickets} LEFT
                  </span>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden border border-border">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(event.ticketsLeft / event.totalTickets) * 100}%` }}
                    className={`h-full ${event.ticketsLeft === 0 ? 'bg-red-500' : 'bg-accent'}`}
                  />
                </div>
              </div>
            </div>
          </DynamicLighting>
        ))}
      </div>
    </div>
  );
};

const UserView = ({ events, tickets, onBuy, onSell }: { events: Event[], tickets: UserTicket[], onBuy: (e: Event) => void, onSell: (t: UserTicket, p: number) => void }) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
          Marketplace <i className='bx bxs-hot text-orange-500'></i>
        </h2>
        <p className="text-text-muted text-sm">Secure your spot. Trade freely. Royalty is settled instantly.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {events.map((event) => (
          <DynamicLighting key={event.id} intensity={0.08}>
            <div className="glass-card hover:border-border transition-colors flex flex-col h-full">
              <div className="h-32 bg-surface-hover relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/40 via-transparent to-transparent " />
                <i className='bx bx-party text-accent/20 text-6xl'></i>
                <div className="absolute top-4 left-4">
                  <Badge color={event.ticketsLeft > 0 ? 'accent' : 'red'}>
                    {event.ticketsLeft > 0 ? 'MINTING LIVE' : 'SOLD OUT'}
                  </Badge>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-lg">{event.name}</h3>
                    <span className="font-mono text-accent font-bold">{formatCurrency(event.price)}</span>
                  </div>
                  <p className="text-[10px] text-text-muted mb-4 uppercase tracking-wider font-semibold">{event.venue} — {event.date}</p>
                </div>
                <button 
                  onClick={() => onBuy(event)}
                  disabled={event.ticketsLeft <= 0}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    event.ticketsLeft > 0 
                    ? 'bg-text-main text-bg hover:bg-accent hover:text-black active:scale-95' 
                    : 'bg-surface-hover text-text-muted cursor-not-allowed border border-border'
                  }`}
                >
                  {event.ticketsLeft > 0 ? (
                    <>Purchase Ticket <i className='bx bx-right-arrow-alt'></i></>
                  ) : (
                    <>Check Secondary Market</>
                  )}
                </button>
              </div>
            </div>
          </DynamicLighting>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <i className='bx bxs-wallet text-accent-purple'></i> Your Digital Wallet
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {tickets.length === 0 ? (
            <div className="col-span-full py-12 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-text-muted">
              <i className='bx bx-purchase-tag-alt text-5xl mb-4 opacity-10'></i>
              <p className="text-sm font-medium">Your wallet is currently empty</p>
              <p className="text-[10px] uppercase tracking-widest mt-1">Buy a ticket to see it here</p>
            </div>
          ) : (
            tickets.map((ticket, i) => (
              <motion.div 
                key={ticket.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-4 relative"
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge color="purple">{ticket.status === 'active' ? 'IN WALLET' : 'PENDING'}</Badge>
                  <p className="font-mono text-[8px] text-text-muted opacity-50 bg-bg px-1.5 rounded">CID: {ticket.contractId}</p>
                </div>
                <h4 className="font-bold text-xs mb-1 line-clamp-1">{ticket.eventName}</h4>
                <p className="text-[9px] text-text-muted mb-6 uppercase tracking-tighter">Initial Cost: {formatCurrency(ticket.purchasePrice)}</p>
                <button 
                  onClick={() => onSell(ticket, ticket.purchasePrice * 1.5)}
                  disabled={ticket.status === 'selling'}
                  className={`w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    ticket.status === 'active'
                    ? 'border-accent-purple/40 text-accent-purple hover:bg-accent-purple hover:text-white'
                    : 'border-border text-text-muted cursor-wait'
                  }`}
                >
                  {ticket.status === 'active' ? 'List for Secondary' : 'Settling Sale...'}
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const ArtistView = ({ balance, claimed, onClaim }: { balance: number, claimed: number, onClaim: () => void }) => {
  return (
    <div className="space-y-8 text-center max-w-2xl mx-auto py-8 md:py-12">
      <div className="space-y-4">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-accent-purple rounded-3xl mx-auto flex items-center justify-center text-white rotate-12 shadow-[0_0_40px_rgba(124,58,237,0.4)] transition-transform hover:rotate-0 hover:scale-110 duration-500">
          <i className='bx bxs-music text-4xl md:text-5xl'></i>
        </div>
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tighter">Royalties Automated.</h2>
          <p className="text-text-muted text-sm md:text-base">Every resale on Canton triggers an instant settlement to your digital address.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DynamicLighting intensity={0.1}>
          <div className="glass-card p-6 md:p-8 space-y-2 group transition-transform h-full">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Unclaimed Earnings</p>
            <p className="text-4xl md:text-5xl font-extrabold text-accent">{formatCurrency(balance)}</p>
            <div className="flex items-center justify-center gap-1 text-[10px] text-accent font-bold">
              <i className='bx bx-trending-up'></i> +12% this week
            </div>
          </div>
        </DynamicLighting>
        <DynamicLighting intensity={0.05}>
          <div className="glass-card p-6 md:p-8 space-y-2 group transition-transform h-full">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Lifetime</p>
            <p className="text-4xl md:text-5xl font-extrabold text-text-main">{formatCurrency(claimed)}</p>
            <p className="text-[10px] text-text-muted font-bold">LEGACY METRICS</p>
          </div>
        </DynamicLighting>
      </div>

      <button 
        onClick={onClaim}
        disabled={balance === 0}
        className={`w-full py-5 rounded-2xl font-extrabold transition-all group relative overflow-hidden ${
          balance > 0 
          ? 'bg-accent-purple text-white shadow-xl hover:scale-[1.02] active:scale-95' 
          : 'bg-surface-hover text-text-muted cursor-not-allowed border border-border'
        }`}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {balance > 0 ? (
            <>Settle To Main Wallet <i className='bx bxs-bolt-circle text-xl'></i></>
          ) : (
            <>No Settlement Available</>
          )}
        </span>
        {balance > 0 && <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />}
      </button>

      <div className="p-4 md:p-6 bg-surface border border-border rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
            <i className='bx bx-analyse text-xl'></i>
          </div>
          <div className="text-left">
            <p className="text-xs font-bold font-display">System Health</p>
            <p className="text-[10px] text-text-muted font-mono tracking-tighter uppercase">99.9% Uptime — Active Shards</p>
          </div>
        </div>
        <div className="flex gap-1 text-accent items-end h-6">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="w-1.5 bg-accent/40 rounded-full" style={{ height: Math.random() * 15 + 5 }} />)}
        </div>
      </div>
    </div>
  );
};

const LedgerFeed = ({ transactions }: { transactions: Transaction[] }) => {
  return (
    <div className="glass-card h-[430px] flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-bold flex items-center gap-2 tracking-widest">
          <i className='bx bx-list-ul text-accent'></i> LIVE PROTOCOL FEED
        </h3>
        <span className="text-[8px] font-mono text-accent animate-pulse">RECORDING</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono scrollbar-hide">
        <AnimatePresence initial={false}>
          {transactions.map((tx) => (
            <motion.div 
              key={tx.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-[10px] space-y-1 border-l-2 border-border pl-4 relative"
            >
              <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-border" />
              <div className="flex justify-between">
                <span className={tx.type === 'secondary' ? 'text-accent-purple font-bold' : tx.type === 'primary' ? 'text-text-main font-bold' : 'text-text-muted font-bold'}>
                  [{tx.type.toUpperCase()}]
                </span>
                <span className="text-text-muted">{tx.time}</span>
              </div>
              <div className="flex items-center gap-1.5 py-0.5">
                <i className={`bx ${tx.type === 'create' ? 'bx-file-blank' : 'bx-cog'} text-[10px]`}></i>
                <p className="text-text-main truncate font-semibold uppercase tracking-tighter">{tx.choice || 'Create Contract'}</p>
              </div>
              <p className="text-[9px] text-text-muted italic opacity-70">Target: {tx.item}</p>
              <div className="flex justify-between items-center bg-bg p-1.5 rounded-lg border border-border mt-2">
                <span className="text-text-main font-bold">{formatCurrency(tx.amount)}</span>
                <span className="text-text-main font-bold text-[9px] uppercase tracking-tighter">Settlement: +{formatCurrency(tx.royaltyEarned)} Creator</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const GlobalStats = ({ secondarySales, totalRoyalty }: { secondarySales: number, totalRoyalty: number }) => {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="glass-card p-6 flex flex-col justify-between h-40 relative group overflow-hidden transition-transform hover:-translate-y-1">
        <i className='bx bx-pulse absolute top-4 right-4 text-accent/10 text-6xl transition-transform group-hover:scale-125'></i>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Protocol Activity</p>
        <div>
          <h4 className="text-4xl font-extrabold tracking-tighter">{secondarySales}</h4>
          <p className="text-[10px] text-text-muted uppercase font-bold mt-1">Secondary Transfers</p>
        </div>
      </div>
      <div className="glass-card p-6 flex flex-col justify-between h-40 relative group overflow-hidden transition-transform hover:-translate-y-1">
        <i className='bx bx-line-chart absolute top-4 right-4 text-accent-purple/10 text-6xl transition-transform group-hover:scale-125'></i>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Global Settled Fees</p>
        <div>
          <h4 className="text-4xl font-extrabold text-accent-purple tracking-tighter">{formatCurrency(Math.floor(totalRoyalty))}</h4>
          <p className="text-[10px] text-text-muted uppercase font-bold mt-1">Returned to Creators</p>
        </div>
      </div>
    </div>
  );
};
