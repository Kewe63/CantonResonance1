import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';
import { fmtUsd, fmtPct } from '../utils/format';
import { useI18n } from '../i18n';
import type { EventContract } from '../services/damlLedger';
import type { ListingContract } from '../services/damlLedger';

type SubTab = 'primary' | 'secondary';

interface Props {
  events: EventContract[];
  listings: ListingContract[];
  partyId: string;
  onBuyTicket: (eventCid: string, seat: string, eventHint?: EventContract['payload']) => Promise<void>;
  onBuySecondary: (listingCid: string) => Promise<void>;
}

export const MarketPanel = ({ events, listings, partyId, onBuyTicket, onBuySecondary }: Props) => {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<SubTab>('primary');
  const [buyingCid, setBuyingCid] = useState<string | null>(null);
  const [buyingEvent, setBuyingEvent] = useState(false);
  const [offerModal, setOfferModal] = useState<{ open: boolean; listingCid: string; offerPrice: number }>({
    open: false,
    listingCid: '',
    offerPrice: 0,
  });

  // ─── Primary Market Handlers ────────────────────────────────
  const handleBuyPrimary = async (event: EventContract) => {
    setBuyingEvent(true);
    try {
      const seat = 'Koltuk ' + (Math.floor(Math.random() * 200) + 1);
      await onBuyTicket(event.contractId, seat, event.payload);
      showToast('🎫', t('market.primaryBuySuccess'), t('market.primaryBuySuccessDetail'));
    } catch (err: any) {
      showToast('❌', t('market.error'), err?.message || t('market.primaryBuyError'), 'error');
    } finally {
      setBuyingEvent(false);
    }
  };

  // ─── Secondary Market Handlers ──────────────────────────────
  const handleBuySecondary = async (cid: string) => {
    setBuyingCid(cid);
    try {
      await onBuySecondary(cid);
      showToast('⚡', t('market.buySuccess'), t('market.buySuccessDetail'));
    } catch (err: any) {
      showToast('❌', t('market.error'), err?.message || t('market.buyError'), 'error');
    } finally {
      setBuyingCid(null);
    }
  };

  const handleOffer = () => {
    showToast('📩', t('market.offerSent'), `${fmtUsd(offerModal.offerPrice)} ${t('market.offerSentDetail')}`);
    setOfferModal({ open: false, listingCid: '', offerPrice: 0 });
  };

  const activeEvents = events.filter(e => !e.payload.isCancelled);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
          {t('market.title')} <i className='bx bx-store-alt text-amber-400'></i>
        </h2>
        <p className="text-text-muted text-sm">{t('market.subtitle')}</p>
      </div>

      {/* Sub-Tab Switcher */}
      <div className="flex bg-bg p-1 rounded-xl border border-border shadow-inner">
        <button
          onClick={() => setSubTab('primary')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            subTab === 'primary'
              ? 'bg-accent text-black shadow-lg'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <i className='bx bxs-badge-check text-sm'></i>
          {t('market.primaryTab')}
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
            subTab === 'primary' ? 'bg-black/20 text-black' : 'bg-surface text-text-muted'
          }`}>
            {activeEvents.length}
          </span>
        </button>
        <button
          onClick={() => setSubTab('secondary')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            subTab === 'secondary'
              ? 'bg-amber-400 text-black shadow-lg'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <i className='bx bx-transfer text-sm'></i>
          {t('market.secondaryTab')}
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
            subTab === 'secondary' ? 'bg-black/20 text-black' : 'bg-surface text-text-muted'
          }`}>
            {listings.length}
          </span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PRIMARY MARKET — Organizer-listed events                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {subTab === 'primary' && (
          <motion.div
            key="primary"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="glass-card p-4 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">{t('market.primaryEvents')}</p>
                <p className="text-2xl font-extrabold text-accent">{activeEvents.length}</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">{t('market.primaryAvgPrice')}</p>
                <p className="text-2xl font-extrabold text-accent-purple">
                  {activeEvents.length > 0
                    ? fmtUsd(activeEvents.reduce((sum, e) => sum + parseFloat(String(e.payload.price)), 0) / activeEvents.length)
                    : '—'}
                </p>
              </div>
              <div className="glass-card p-4 text-center col-span-2 sm:col-span-1">
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">{t('market.primaryTotalTickets')}</p>
                <p className="text-2xl font-extrabold text-text-main">
                  {activeEvents.reduce((sum, e) => {
                    const total = parseInt(String(e.payload.totalTickets ?? '0'));
                    const sold = parseInt(String(e.payload.ticketsSold ?? '0'));
                    return sum + (total - sold);
                  }, 0)}
                </p>
              </div>
            </div>

            {/* Event Cards Grid */}
            {activeEvents.length === 0 ? (
              <div className="py-16 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-text-muted">
                <i className='bx bx-calendar-event text-6xl mb-4 opacity-10'></i>
                <p className="text-sm font-bold">{t('market.primaryEmpty')}</p>
                <p className="text-[10px] uppercase tracking-widest mt-1">{t('market.primaryEmptyHint')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {activeEvents.map((event, i) => {
                  const sold = parseInt(String(event.payload.ticketsSold ?? '0'));
                  const total = parseInt(String(event.payload.totalTickets ?? '0'));
                  const available = total - sold > 0;
                  const pctSold = total > 0 ? Math.round((sold / total) * 100) : 0;

                  return (
                    <motion.div
                      key={event.contractId}
                      initial={{ scale: 0.92, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 20 }}
                      className="glass-card overflow-hidden group"
                    >
                      {/* Event Header Visual */}
                      <div className="relative h-28 bg-surface-hover overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/40 via-transparent to-transparent" />
                        <i className='bx bx-party text-accent/15 text-5xl group-hover:scale-110 transition-transform duration-500'></i>

                        {/* Availability Badge */}
                        <div className="absolute top-3 left-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border flex items-center gap-1 ${
                            available
                              ? 'bg-accent/10 text-accent border-accent/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            <i className={`bx ${available ? 'bxs-badge-check' : 'bx-block'} text-[10px]`}></i>
                            {available ? `${total - sold} ${t('market.primaryTicketsLeft')}` : t('market.primarySoldOut')}
                          </span>
                        </div>

                        {/* Price Tag */}
                        <div className="absolute top-3 right-3 bg-bg/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-border">
                          <span className="text-sm font-extrabold text-accent font-mono">{fmtUsd(event.payload.price)}</span>
                        </div>

                        {/* Official Badge */}
                        <div className="absolute bottom-3 left-3">
                          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border bg-accent/10 text-accent border-accent/20 flex items-center gap-1">
                            <i className='bx bxs-check-shield text-[10px]'></i>
                            {t('market.primaryOfficial')}
                          </span>
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h4 className="font-bold text-base truncate">{event.payload.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-text-muted">{event.payload.venue}</p>
                            <span className="text-[8px] text-text-muted">·</span>
                            <p className="text-[10px] text-text-muted">{event.payload.date}</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-text-muted font-bold">{t('market.primarySalesProgress')}</span>
                            <span className="text-accent font-mono font-bold">{sold}/{total}</span>
                          </div>
                          <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-purple"
                              initial={{ width: 0 }}
                              animate={{ width: `${pctSold}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                        </div>

                        {/* Info Row */}
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 text-text-muted">
                            <i className='bx bxs-user-badge text-[11px]'></i>
                            <span className="font-mono">{String(event.payload.organizer || '').slice(0, 14)}...</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-accent-purple font-bold">
                              {fmtPct(event.payload.royaltyPct)} {t('market.royalty')}
                            </span>
                          </div>
                        </div>

                        {/* Buy Button */}
                        {available && (
                          <button
                            onClick={() => handleBuyPrimary(event)}
                            disabled={buyingEvent}
                            className="w-full py-2.5 rounded-xl text-xs font-bold bg-text-main text-bg hover:bg-accent hover:text-black active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {buyingEvent ? (
                              <>
                                <div className="w-3 h-3 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                                {t('market.primaryBuying')}
                              </>
                            ) : (
                              <>
                                🎫 {t('market.primaryBuy')}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECONDARY MARKET — User resale listings                    */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {subTab === 'secondary' && (
          <motion.div
            key="secondary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="glass-card p-4 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">{t('market.totalListings')}</p>
                <p className="text-2xl font-extrabold text-accent">{listings.length}</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">{t('market.avgPrice')}</p>
                <p className="text-2xl font-extrabold text-accent-purple">
                  {listings.length > 0
                    ? fmtUsd(listings.reduce((sum, l) => sum + parseFloat(l.payload.price), 0) / listings.length)
                    : '—'}
                </p>
              </div>
              <div className="glass-card p-4 text-center col-span-2 sm:col-span-1">
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">{t('market.uniqueSellers')}</p>
                <p className="text-2xl font-extrabold text-text-main">
                  {new Set(listings.map(l => l.payload.seller)).size}
                </p>
              </div>
            </div>

            {/* Listings Grid */}
            {listings.length === 0 ? (
              <div className="py-16 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-text-muted">
                <i className='bx bx-store text-6xl mb-4 opacity-10'></i>
                <p className="text-sm font-bold">{t('market.empty')}</p>
                <p className="text-[10px] uppercase tracking-widest mt-1">{t('market.emptyHint')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {listings.map((listing, i) => {
                  const isMine = listing.payload.seller === partyId;
                  const ticket = listing.payload.ticket;
                  const royalty = parseFloat(listing.payload.price) * parseFloat(ticket.royaltyPct) / 100;
                  const isBuying = buyingCid === listing.contractId;

                  return (
                    <motion.div
                      key={listing.contractId}
                      initial={{ scale: 0.92, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 20 }}
                      className="glass-card overflow-hidden group"
                    >
                      {/* Ticket Header Visual */}
                      <div className="relative h-24 bg-surface-hover overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400/40 via-transparent to-transparent" />
                        <i className='bx bx-transfer text-amber-400/15 text-5xl group-hover:scale-110 transition-transform duration-500'></i>

                        {/* Seller Badge */}
                        <div className="absolute top-3 left-3">
                          {isMine ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-accent/10 text-accent border-accent/20 flex items-center gap-1">
                              <i className='bx bxs-user-check text-[10px]'></i>
                              {t('market.myListing')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-amber-400/10 text-amber-400 border-amber-400/20">
                              {t('market.secondHand')}
                            </span>
                          )}
                        </div>

                        {/* Price Tag */}
                        <div className="absolute top-3 right-3 bg-bg/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-border">
                          <span className="text-sm font-extrabold text-accent font-mono">{fmtUsd(listing.payload.price)}</span>
                        </div>
                      </div>

                      {/* Ticket Details */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h4 className="font-bold text-base truncate">{ticket.eventName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-text-muted font-mono">{ticket.seat}</p>
                            <span className="text-[8px] text-text-muted">·</span>
                            <p className="text-[10px] text-text-muted">{ticket.eventVenue}</p>
                          </div>
                          <p className="text-[10px] text-text-muted mt-0.5">{ticket.eventDate}</p>
                        </div>

                        {/* Info Row */}
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 text-text-muted">
                            <i className='bx bxs-user text-[11px]'></i>
                            <span className="font-mono">{listing.payload.seller.slice(0, 14)}...</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-accent-purple font-bold">
                              {fmtPct(ticket.royaltyPct)} {t('market.royalty')}
                            </span>
                          </div>
                        </div>

                        {/* Original vs Current Price */}
                        <div className="flex items-center justify-between bg-bg/60 rounded-lg px-3 py-2 border border-border/50">
                          <div className="text-center">
                            <p className="text-[8px] text-text-muted uppercase tracking-widest">{t('market.originalPrice')}</p>
                            <p className="text-xs font-mono font-bold text-text-muted line-through">{fmtUsd(ticket.originalPrice)}</p>
                          </div>
                          <i className='bx bx-right-arrow-alt text-text-muted text-sm'></i>
                          <div className="text-center">
                            <p className="text-[8px] text-text-muted uppercase tracking-widest">{t('market.listingPrice')}</p>
                            <p className="text-xs font-mono font-bold text-accent">{fmtUsd(listing.payload.price)}</p>
                          </div>
                        </div>

                        {/* Royalty Breakdown */}
                        <div className="flex items-center justify-between text-[10px] px-1">
                          <span className="text-text-muted">{t('market.artistRoyalty')}</span>
                          <span className="text-accent-purple font-bold font-mono">{fmtUsd(royalty)}</span>
                        </div>

                        {/* Action Buttons — disabled for own listings */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={isMine ? undefined : () => handleBuySecondary(listing.contractId)}
                            disabled={isMine || isBuying}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              isMine
                                ? 'bg-accent/30 text-black/40 opacity-40 cursor-not-allowed'
                                : 'bg-accent text-black hover:opacity-90 active:scale-95 disabled:opacity-50'
                            }`}
                          >
                            {isBuying && !isMine ? (
                              <>
                                <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                {t('market.buying')}
                              </>
                            ) : (
                              <>
                                <i className='bx bxs-cart text-sm'></i>
                                {t('market.buyNow')}
                              </>
                            )}
                          </button>
                          <button
                            onClick={
                              isMine
                                ? undefined
                                : () =>
                                    setOfferModal({
                                      open: true,
                                      listingCid: listing.contractId,
                                      offerPrice: Math.round(parseFloat(listing.payload.price) * 0.85),
                                    })
                            }
                            disabled={isMine}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                              isMine
                                ? 'border-accent-purple/20 text-accent-purple/30 opacity-40 cursor-not-allowed'
                                : 'border-accent-purple/40 text-accent-purple hover:bg-accent-purple hover:text-white active:scale-95'
                            }`}
                          >
                            <i className='bx bxs-offer text-sm'></i>
                            {t('market.makeOffer')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offer Modal */}
      <AnimatePresence>
        {offerModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={() => setOfferModal({ ...offerModal, open: false })}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-extrabold mb-1 flex items-center gap-2">
                <i className='bx bxs-offer text-accent-purple'></i>
                {t('market.offerModalTitle')}
              </h3>
              <p className="text-[10px] text-text-muted mb-4">{t('market.offerModalDesc')}</p>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">{t('market.yourOffer')}</label>
                  <input
                    type="number"
                    value={offerModal.offerPrice}
                    onChange={(e) => setOfferModal({ ...offerModal, offerPrice: +e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm focus:border-accent-purple outline-none font-mono"
                    min={1}
                  />
                </div>

                <div className="p-3 bg-bg rounded-lg border border-amber-400/20">
                  <p className="text-[10px] font-bold text-amber-400 uppercase mb-2">{t('market.offerInfo')}</p>
                  <p className="text-[10px] text-text-muted leading-relaxed">{t('market.offerInfoDetail')}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setOfferModal({ ...offerModal, open: false })}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-border text-text-muted hover:bg-surface-hover transition-all"
                  >
                    {t('market.cancel')}
                  </button>
                  <button
                    onClick={handleOffer}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-accent-purple text-white hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <i className='bx bx-send text-sm'></i>
                    {t('market.sendOffer')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
