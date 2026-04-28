import { authService } from '../src/services/authService.ts';
import { createLedgerClient } from '../src/services/damlLedger.ts';

function nowIso() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function log(...args) {
  console.log(`[${nowIso()}]`, ...args);
}

async function main() {
  const email = process.env.DEVNET_EMAIL;
  const password = process.env.DEVNET_PASSWORD;

  if (!email || !password) {
    throw new Error('DEVNET_EMAIL ve DEVNET_PASSWORD environment değişkenleri zorunlu.');
  }

  log('DevNet login...');
  const party = await authService.loginWithKeycloak(email, password);
  log('Logged party:', party);

  const ledger = await createLedgerClient(party);

  const eventName = `Smoke Event ${Date.now()}`;
  const eventDate = '2026-12-31';
  const eventVenue = 'Istanbul';

  log('Creating event...');
  const createdEvent = await ledger.create('Event', {
    organizer: party,
    artist: party,
    public: party,
    name: eventName,
    date: eventDate,
    venue: eventVenue,
    totalTickets: 2,
    price: '10.0',
    royaltyPct: '15.0',
    ticketsSold: 0,
    maxResaleMultiplier: null,
    isCancelled: false,
  });

  log('Created event:', createdEvent.contractId);

  const beforeEvents = await ledger.query('Event');
  const selected = beforeEvents.find((e) => e.payload.name === eventName && e.payload.date === eventDate && e.payload.venue === eventVenue && !e.payload.isCancelled);
  if (!selected) {
    throw new Error('Created event query ile bulunamadı.');
  }

  log('Selected event for buy:', selected.contractId, 'ticketsSold=', selected.payload.ticketsSold);

  const buy1 = await ledger.exercise('Event', selected.contractId, 'BuyTicket', {
    buyer: party,
    seat: `Seat-${Math.floor(Math.random() * 10000)}`,
    _eventHint: selected.payload,
  });

  log('Buy #1 result:', JSON.stringify(buy1));

  const eventsAfter1 = await ledger.query('Event');
  const latestAfter1 = eventsAfter1.find((e) => e.payload.name === eventName && e.payload.date === eventDate && e.payload.venue === eventVenue && !e.payload.isCancelled);
  if (!latestAfter1) {
    throw new Error('Buy #1 sonrası event bulunamadı.');
  }

  log('Event after buy #1:', latestAfter1.contractId, 'ticketsSold=', latestAfter1.payload.ticketsSold);

  const buy2 = await ledger.exercise('Event', latestAfter1.contractId, 'BuyTicket', {
    buyer: party,
    seat: `Seat-${Math.floor(Math.random() * 10000)}`,
    _eventHint: latestAfter1.payload,
  });

  log('Buy #2 result:', JSON.stringify(buy2));

  const tickets = await ledger.query('UserTicket');
  const owned = tickets.filter((t) => t.payload.eventName === eventName && String(t.payload.owner) === String(party));
  log('Owned tickets for smoke event:', owned.length);

  if (owned.length < 2) {
    throw new Error(`Beklenen 2 ticket yerine ${owned.length} bulundu.`);
  }

  log('SMOKE OK');
}

main().catch((err) => {
  console.error('SMOKE FAILED:', err?.message || err);
  process.exit(1);
});
