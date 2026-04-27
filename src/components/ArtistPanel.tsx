/**
 * Canton Ticket — Artist Royalty Dashboard
 * Shows real-time royalty earnings from secondary market sales
 */
import React from 'react';
import { motion } from 'motion/react';
import { DynamicLighting } from './DynamicLighting';
import { fmtUsd, fmtPct } from '../utils/format';
import { useI18n } from '../i18n';
import type { RoyaltyContract, EventContract } from '../services/damlLedger';

interface Props {
  events: EventContract[];
  receipts: RoyaltyContract[];
  partyId: string;
}

export const ArtistPanel = ({ events, receipts, partyId }: Props) => {
  const { t } = useI18n();
  const totalRoyalty = receipts.reduce((sum, r) => sum + parseFloat(r.payload.royaltyAmount || '0'), 0);
  const totalSales = receipts.length;
  const avgRoyalty = totalSales > 0 ? totalRoyalty / totalSales : 0;

  // Group by event
  const eventMap = new Map<string, { count: number; total: number }>();
  receipts.forEach(r => {
    const key = r.payload.eventName;
    const prev = eventMap.get(key) || { count: 0, total: 0 };
    eventMap.set(key, {
      count: prev.count + 1,
      total: prev.total + parseFloat(r.payload.royaltyAmount || '0'),
    });
  });

  // Filter events where the logged-in user is the artist
  const myEvents = events.filter(e => e.payload.artist === partyId);

  // Primary Sales Earnings Calculation
  let totalPrimaryEarnings = 0;
  let totalPrimarySales = 0;
  myEvents.forEach(e => {
    const priceNum = parseFloat(String(e.payload.price || '0'));
    const royaltyPctNum = parseFloat(String(e.payload.royaltyPct || '0'));
    const artistShare = priceNum * (royaltyPctNum / 100);
    const sold = parseInt(String(e.payload.ticketsSold || '0'));
    totalPrimaryEarnings += artistShare * sold;
    totalPrimarySales += sold;
  });

  const grandTotalEarnings = totalRoyalty + totalPrimaryEarnings;
  const grandTotalSales = totalSales + totalPrimarySales;
  const avgEarnings = grandTotalSales > 0 ? grandTotalEarnings / grandTotalSales : 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
          {t('artist.title')} <i className='bx bxs-music text-accent-purple'></i>
        </h2>
        <p className="text-text-muted text-sm">{t('artist.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DynamicLighting intensity={0.12}>
          <div className="glass-card p-6 group hover:border-accent/30 transition-colors h-full">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">{t('artist.totalEarnings')}</p>
            <p className="text-3xl md:text-4xl font-extrabold text-accent">{fmtUsd(grandTotalEarnings)}</p>
            <div className="flex flex-col gap-0.5 text-[10px] text-text-muted font-mono mt-2">
              <span className="text-accent"><i className='bx bx-party'></i> {t('artist.primary')} {fmtUsd(totalPrimaryEarnings)}</span>
              <span className="text-accent-purple"><i className='bx bx-transfer'></i> {t('artist.secondary')} {fmtUsd(totalRoyalty)}</span>
            </div>
          </div>
        </DynamicLighting>

        <DynamicLighting intensity={0.08}>
          <div className="glass-card p-6 group hover:border-accent-purple/30 transition-colors h-full">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">{t('artist.totalTicketSales')}</p>
            <p className="text-3xl md:text-4xl font-extrabold text-text-main">{grandTotalSales}</p>
            <div className="flex flex-col gap-0.5 text-[10px] text-text-muted font-mono mt-2 uppercase">
              <span>{totalPrimarySales} {t('artist.primarySales')}</span>
              <span>{totalSales} {t('artist.secondaryTransfer')}</span>
            </div>
          </div>
        </DynamicLighting>

        <DynamicLighting intensity={0.06}>
          <div className="glass-card p-6 group hover:border-border transition-colors h-full">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">{t('artist.avgEarnings')}</p>
            <p className="text-3xl md:text-4xl font-extrabold text-accent-purple">{fmtUsd(avgEarnings)}</p>
            <p className="text-[10px] text-text-muted font-bold mt-2 uppercase">{t('artist.perTicket')}</p>
          </div>
        </DynamicLighting>
      </div>

      {/* Per-Event Secondary Breakdown */}
      {eventMap.size > 0 && (
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <i className='bx bxs-bar-chart-alt-2 text-accent'></i> {t('artist.secondaryEarnings')}
          </h3>
          <div className="space-y-3">
            {Array.from(eventMap.entries()).map(([name, data]) => (
              <div key={name} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm">{name}</p>
                  <p className="text-[10px] text-text-muted font-mono">{data.count} {t('artist.salesCount')}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-accent">{fmtUsd(data.total)}</span>
                  <p className="text-[10px] text-text-muted font-mono">{t('artist.royaltyIncome')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Events & Potential Primary Earnings */}
      {myEvents.length > 0 && (
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <i className='bx bx-calendar-star text-accent-purple'></i> {t('artist.myEvents')}
          </h3>
          <div className="space-y-3">
            {myEvents.map(e => {
              const priceNum = parseFloat(String(e.payload.price || '0'));
              const royaltyPctNum = parseFloat(String(e.payload.royaltyPct || '0'));
              const artistShare = priceNum * (royaltyPctNum / 100);
              const sold = parseInt(String(e.payload.ticketsSold || '0'));
              const totalEventEarnings = sold * artistShare;

              return (
                <div key={e.contractId} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-l-accent-purple">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-sm">{e.payload.name}</p>
                      {e.payload.isCancelled && <span className="text-[8px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-bold">{t('artist.cancelledBadge')}</span>}
                    </div>
                    <p className="text-[10px] text-text-muted font-mono">
                      {t('artist.ticket')} {fmtUsd(priceNum)} · {t('artist.artistShare')} {fmtPct(royaltyPctNum)} ({fmtUsd(artistShare)}{t('artist.perTicketShort')})
                    </p>
                  </div>
                  <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 sm:gap-0">
                    <div className="text-left sm:text-right bg-surface px-3 py-1.5 rounded-lg border border-border">
                      <p className="text-[10px] text-text-muted font-bold uppercase mb-0.5">{t('artist.sold')}</p>
                      <span className="text-sm font-extrabold text-text-main">{sold} {t('artist.ticketUnit')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-extrabold text-accent-purple">{fmtUsd(totalEventEarnings)}</span>
                      <p className="text-[10px] text-text-muted font-mono">{t('artist.totalEarningsLabel')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Receipts Timeline */}
      <div>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
          <i className='bx bx-receipt text-accent-purple'></i> {t('artist.royaltyReceipts')}
        </h3>
        {receipts.length === 0 ? (
          <div className="py-16 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-text-muted">
            <div className="w-20 h-20 bg-accent-purple/10 rounded-3xl flex items-center justify-center mb-4 rotate-6">
              <i className='bx bxs-music text-accent-purple text-3xl'></i>
            </div>
            <p className="text-sm font-medium">{t('artist.noRoyalty')}</p>
            <p className="text-[10px] uppercase tracking-widest mt-1">{t('artist.noRoyaltyHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((r, i) => (
              <motion.div
                key={r.contractId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple shrink-0 mt-0.5">
                      <i className='bx bx-transfer text-lg'></i>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{r.payload.eventName}</p>
                      <p className="text-[10px] text-text-muted font-mono">{r.payload.ticketSeat} · {fmtPct(r.payload.royaltyPct)} {t('artist.rate')}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {r.payload.seller.slice(0, 10)}... → {r.payload.buyer.slice(0, 10)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-right sm:text-right">
                    <p className="text-lg font-extrabold text-accent">+{fmtUsd(r.payload.royaltyAmount)}</p>
                    <p className="text-[10px] text-text-muted font-mono">{t('artist.sale')} {fmtUsd(r.payload.salePrice)}</p>
                    <p className="text-[8px] font-mono text-text-muted bg-bg px-1.5 py-0.5 rounded inline-block mt-1">
                      CID: {r.contractId.slice(0, 16)}...
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* System Info */}
      <div className="p-4 md:p-6 bg-surface border border-border rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple shrink-0">
            <i className='bx bx-shield-quarter text-xl'></i>
          </div>
          <div className="text-left">
            <p className="text-xs font-bold">Canton Royalty Engine</p>
            <p className="text-[10px] text-text-muted font-mono tracking-tighter uppercase">
              {t('artist.autoDistribution')} — {partyId.slice(0, 20)}
            </p>
          </div>
        </div>
        <div className="flex gap-1 text-accent-purple items-end h-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="w-1.5 bg-accent-purple/40 rounded-full" style={{ height: Math.random() * 15 + 5 }} />
          ))}
        </div>
      </div>
    </div>
  );
};
