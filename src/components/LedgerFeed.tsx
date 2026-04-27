/**
 * Canton Ticket — Live Ledger Feed & Global Stats
 * Shows real-time protocol activity and transaction history
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fmtUsd } from '../utils/format';
import { useI18n } from '../i18n';
import type { RoyaltyContract, EventContract, TicketContract } from '../services/damlLedger';

interface FeedEntry {
  id: string;
  type: 'primary' | 'secondary' | 'create' | 'cancel' | 'use';
  title: string;
  detail: string;
  amount?: string;
  royalty?: string;
  time: string;
}

interface Props {
  events: EventContract[];
  tickets: TicketContract[];
  receipts: RoyaltyContract[];
}

export const LedgerFeed = ({ events, tickets, receipts }: Props) => {
  const { t } = useI18n();
  // Build a combined feed from all contract data
  const feed: FeedEntry[] = [];

  // Add events as CREATE entries
  events.forEach(e => {
    feed.push({
      id: `evt-${e.contractId}`,
      type: 'create',
      title: 'Create Event',
      detail: e.payload.name,
      amount: `${e.payload.totalTickets} ${t('feed.ticketUnit')} · ${fmtUsd(e.payload.price)}`,
      time: e.payload.date,
    });
  });

  // Add royalty receipts as SECONDARY entries
  receipts.forEach(r => {
    feed.push({
      id: `roy-${r.contractId}`,
      type: 'secondary',
      title: 'Exercise BuySecondary',
      detail: `${r.payload.eventName} — ${r.payload.ticketSeat}`,
      amount: `${fmtUsd(r.payload.salePrice)}`,
      royalty: `+${fmtUsd(r.payload.royaltyAmount)} ${t('feed.toArtist')}`,
      time: 'Ledger',
    });
  });

  // Add tickets as PRIMARY entries
  tickets.forEach(tk => {
    feed.push({
      id: `tkt-${tk.contractId}`,
      type: tk.payload.isUsed ? 'use' : 'primary',
      title: tk.payload.isUsed ? 'Exercise UseTicket' : 'Exercise BuyTicket',
      detail: `${tk.payload.eventName} — ${tk.payload.seat}`,
      amount: `${fmtUsd(tk.payload.currentPrice)}`,
      time: 'Ledger',
    });
  });

  const totalSecondarySales = receipts.length;
  const totalRoyalty = receipts.reduce((sum, r) => sum + parseFloat(r.payload.royaltyAmount || '0'), 0);
  const totalTicketsSold = events.reduce((sum, e) => sum + Number(e.payload.ticketsSold || 0), 0);

  const typeColors: Record<string, string> = {
    primary: 'text-text-main',
    secondary: 'text-accent-purple',
    create: 'text-accent',
    cancel: 'text-red-500',
    use: 'text-amber-400',
  };

  const typeIcons: Record<string, string> = {
    primary: 'bx-purchase-tag',
    secondary: 'bx-transfer',
    create: 'bx-file-blank',
    cancel: 'bx-x-circle',
    use: 'bx-check-circle',
  };

  return (
    <div className="space-y-6">
      {/* Live Feed */}
      <div className="glass-card h-[430px] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-bold flex items-center gap-2 tracking-widest">
            <i className='bx bx-list-ul text-accent'></i> {t('feed.liveFeed')}
          </h3>
          <span className="text-[8px] font-mono text-accent animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
            {t('feed.recording')}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono scrollbar-hide">
          {feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <i className='bx bx-loader-alt text-3xl mb-3 animate-spin opacity-20'></i>
              <p className="text-[10px] uppercase tracking-widest">{t('feed.waiting')}</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {feed.slice(0, 20).map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="text-[10px] space-y-1 border-l-2 border-border pl-4 relative"
                >
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-border" />
                  <div className="flex justify-between">
                    <span className={`${typeColors[entry.type] || 'text-text-main'} font-bold`}>
                      [{entry.type.toUpperCase()}]
                    </span>
                    <span className="text-text-muted">{entry.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5 py-0.5">
                    <i className={`bx ${typeIcons[entry.type] || 'bx-cog'} text-[10px]`}></i>
                    <p className="text-text-main truncate font-semibold uppercase tracking-tighter">
                      {entry.title}
                    </p>
                  </div>
                  <p className="text-[9px] text-text-muted italic opacity-70 truncate">
                    Target: {entry.detail}
                  </p>
                  {(entry.amount || entry.royalty) && (
                    <div className="flex justify-between items-center bg-bg p-1.5 rounded-lg border border-border mt-1">
                      {entry.amount && <span className="text-text-main font-bold">{entry.amount}</span>}
                      {entry.royalty && (
                        <span className="text-accent-purple font-bold text-[9px] uppercase tracking-tighter">
                          {entry.royalty}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 gap-4">
        <div className="glass-card p-6 flex flex-col justify-between h-36 relative group overflow-hidden transition-transform hover:-translate-y-1">
          <i className='bx bx-pulse absolute top-4 right-4 text-accent/10 text-6xl transition-transform group-hover:scale-125'></i>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{t('feed.protocolActivity')}</p>
          <div>
            <h4 className="text-3xl font-extrabold tracking-tighter">{totalTicketsSold}</h4>
            <p className="text-[10px] text-text-muted uppercase font-bold mt-1">{t('feed.totalTicketSales')}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex flex-col justify-between h-36 relative group overflow-hidden transition-transform hover:-translate-y-1">
          <i className='bx bx-transfer absolute top-4 right-4 text-accent-purple/10 text-6xl transition-transform group-hover:scale-125'></i>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{t('feed.secondaryTransfer')}</p>
          <div>
            <h4 className="text-3xl font-extrabold tracking-tighter">{totalSecondarySales}</h4>
            <p className="text-[10px] text-text-muted uppercase font-bold mt-1">{t('feed.royaltyTransaction')}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex flex-col justify-between h-36 relative group overflow-hidden transition-transform hover:-translate-y-1">
          <i className='bx bx-line-chart absolute top-4 right-4 text-accent-purple/10 text-6xl transition-transform group-hover:scale-125'></i>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{t('feed.distributedRoyalty')}</p>
          <div>
            <h4 className="text-3xl font-extrabold text-accent-purple tracking-tighter">{fmtUsd(totalRoyalty)}</h4>
            <p className="text-[10px] text-text-muted uppercase font-bold mt-1">{t('feed.paidToArtists')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
