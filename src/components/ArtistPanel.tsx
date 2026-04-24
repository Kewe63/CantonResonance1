/**
 * Canton Ticket — Artist Royalty Dashboard
 * Shows real-time royalty earnings from secondary market sales
 */
import React from 'react';
import { motion } from 'motion/react';
import { DynamicLighting } from './DynamicLighting';
import type { RoyaltyContract } from '../services/damlLedger';

interface Props {
  receipts: RoyaltyContract[];
  partyId: string;
}

export const ArtistPanel = ({ receipts, partyId }: Props) => {
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
          Sanatçı Panosu <i className='bx bxs-music text-accent-purple'></i>
        </h2>
        <p className="text-text-muted text-sm">Her ikinci el satışta royalty otomatik olarak Canton üzerinden hesaplanır.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DynamicLighting intensity={0.12}>
          <div className="glass-card p-6 group hover:border-accent/30 transition-colors h-full">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Toplam Kazanç</p>
            <p className="text-3xl md:text-4xl font-extrabold text-accent">{totalRoyalty.toFixed(1)} <span className="text-base font-bold">USDC</span></p>
            <div className="flex items-center gap-1 text-[10px] text-accent font-bold mt-2">
              <i className='bx bx-trending-up'></i> Canton Ledger'dan
            </div>
          </div>
        </DynamicLighting>

        <DynamicLighting intensity={0.08}>
          <div className="glass-card p-6 group hover:border-accent-purple/30 transition-colors h-full">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Toplam Satış</p>
            <p className="text-3xl md:text-4xl font-extrabold text-text-main">{totalSales}</p>
            <p className="text-[10px] text-text-muted font-bold mt-2 uppercase">İkinci el transfer</p>
          </div>
        </DynamicLighting>

        <DynamicLighting intensity={0.06}>
          <div className="glass-card p-6 group hover:border-border transition-colors h-full">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Ortalama Royalty</p>
            <p className="text-3xl md:text-4xl font-extrabold text-accent-purple">{avgRoyalty.toFixed(1)} <span className="text-base font-bold">USDC</span></p>
            <p className="text-[10px] text-text-muted font-bold mt-2 uppercase">Satış başına</p>
          </div>
        </DynamicLighting>
      </div>

      {/* Per-Event Breakdown */}
      {eventMap.size > 0 && (
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <i className='bx bxs-bar-chart-alt-2 text-accent'></i> Etkinlik Bazlı Kazanç
          </h3>
          <div className="space-y-3">
            {Array.from(eventMap.entries()).map(([name, data]) => (
              <div key={name} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm">{name}</p>
                  <p className="text-[10px] text-text-muted font-mono">{data.count} satış</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-accent">{data.total.toFixed(1)} USDC</span>
                  <p className="text-[10px] text-text-muted font-mono">royalty geliri</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipts Timeline */}
      <div>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
          <i className='bx bx-receipt text-accent-purple'></i> Royalty Makbuzları
        </h3>
        {receipts.length === 0 ? (
          <div className="py-16 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-text-muted">
            <div className="w-20 h-20 bg-accent-purple/10 rounded-3xl flex items-center justify-center mb-4 rotate-6">
              <i className='bx bxs-music text-accent-purple text-3xl'></i>
            </div>
            <p className="text-sm font-medium">Henüz royalty kazancı yok</p>
            <p className="text-[10px] uppercase tracking-widest mt-1">İkinci el satışlar başladığında buraya düşecek</p>
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
                      <p className="text-[10px] text-text-muted font-mono">{r.payload.ticketSeat} · %{r.payload.royaltyPct} oran</p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {r.payload.seller.slice(0, 10)}... → {r.payload.buyer.slice(0, 10)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-right sm:text-right">
                    <p className="text-lg font-extrabold text-accent">+{r.payload.royaltyAmount} USDC</p>
                    <p className="text-[10px] text-text-muted font-mono">satış: {r.payload.salePrice} USDC</p>
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
              Smart Contract ile otomatik dağıtım — {partyId.slice(0, 20)}
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
