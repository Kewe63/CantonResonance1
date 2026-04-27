import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';
import { fmtUsd, fmtPct } from '../utils/format';
import { useI18n } from '../i18n';
import type { EventContract, TicketContract, ListingContract } from '../services/damlLedger';

interface Props {
  events: EventContract[];
  tickets: TicketContract[];
  listings: ListingContract[];
  partyId: string;
  onBuyTicket: (eventCid: string, seat: string, eventHint?: EventContract['payload']) => Promise<void>;
  onListForSale: (ticketCid: string, price: number) => Promise<void>;
  onBuySecondary: (listingCid: string) => Promise<void>;
  onCancelListing: (listingCid: string) => Promise<void>;
  onUseTicket: (ticketCid: string) => Promise<void>;
}

export const UserPanel = ({ events, tickets, listings, partyId, onBuyTicket, onListForSale, onBuySecondary, onCancelListing, onUseTicket }: Props) => {
  const [selectedEventCid, setSelectedEventCid] = useState<string|null>(null);
  const [sellModal, setSellModal] = useState<{open:boolean; ticketCid:string; price:number}>({open:false,ticketCid:'',price:80});
  const [buying, setBuying] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const { showToast } = useToast();
  const { t } = useI18n();

  const selectedEvent = events.find(e => e.contractId === selectedEventCid);

  useEffect(() => {
    if (!selectedEventCid) return;
    if (events.some((event) => event.contractId === selectedEventCid)) return;

    const replacement = events.find((event) => !event.payload.isCancelled);
    if (replacement) {
      setSelectedEventCid(replacement.contractId);
    } else {
      setSelectedEventCid(null);
    }
  }, [events, selectedEventCid]);

  const handleBuy = async (event: EventContract) => {
    setBuying(true);
    try {
      const seat = 'Koltuk ' + (Math.floor(Math.random()*200)+1);
      await onBuyTicket(event.contractId, seat, event.payload);
      showToast('🎫', t('user.ticketBought'), t('user.ticketBoughtDetail'));
    } catch (err: any) {
      showToast('❌', t('user.error'), err?.message || t('user.ticketBuyError'), 'error');
    } finally {
      setBuying(false);
    }
  };

  const handleList = async () => {
    setIsListing(true);
    try {
      await onListForSale(sellModal.ticketCid, sellModal.price);
      showToast('📢', t('user.listed'), t('user.listedDetail'));
      setSellModal({open:false,ticketCid:'',price:80});
    } catch (err: any) {
      showToast('❌', t('user.error'), err?.message || t('user.listError'), 'error');
    } finally {
      setIsListing(false);
    }
  };

  const handleBuySecondary = async (cid: string) => {
    try {
      await onBuySecondary(cid);
      showToast('⚡', t('user.secondaryBought'), t('user.secondaryBoughtDetail'));
    } catch (err: any) {
      showToast('❌', t('user.error'), err?.message || t('user.secondaryBuyError'), 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
          {t('user.title')} <i className='bx bxs-hot text-orange-500'></i>
        </h2>
        <p className="text-text-muted text-sm">{t('user.subtitle')}</p>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {events.filter(e=>!e.payload.isCancelled).map(event => {
          const sold = parseInt(String(event.payload.ticketsSold ?? '0'));
          const total = parseInt(String(event.payload.totalTickets ?? '0'));
          const available = total - sold > 0;
          const isSelected = selectedEventCid === event.contractId;
          return (
            <div key={event.contractId} onClick={()=>setSelectedEventCid(event.contractId)}
              className={`glass-card cursor-pointer transition-all ${isSelected ? 'border-accent ring-1 ring-accent/20' : 'hover:border-border'}`}>
              <div className="h-28 bg-surface-hover relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/40 via-transparent to-transparent"/>
                <i className='bx bx-party text-accent/20 text-5xl'></i>
                <div className="absolute top-3 left-3">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${available?'bg-accent/10 text-accent border-accent/20':'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                    {available ? `${total-sold} ${t('user.ticketsLeft')}` : t('user.soldOut')}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-base truncate">{event.payload.name}</h3>
                  <span className="font-mono text-accent font-bold text-sm">{fmtUsd(event.payload.price)}</span>
                </div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">{event.payload.venue} — {event.payload.date}</p>
                <p className="text-[10px] text-accent-purple mt-1 font-mono">{fmtPct(event.payload.royaltyPct)} {t('user.royaltyToArtist')}</p>
                {isSelected && available && (
                  <button onClick={(e)=>{e.stopPropagation();handleBuy(event)}} disabled={buying}
                    className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold bg-text-main text-bg hover:bg-accent hover:text-black active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {buying ? <><div className="w-3 h-3 border-2 border-bg border-t-transparent rounded-full animate-spin"/>{t('user.buying')}</> : <>🎫 {t('user.buy')}</>}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* My Wallet */}
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
          <i className='bx bxs-wallet text-accent-purple'></i> {t('user.wallet')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {tickets.length === 0 ? (
            <div className="col-span-full py-12 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-text-muted">
              <i className='bx bx-purchase-tag-alt text-5xl mb-3 opacity-10'></i>
              <p className="text-sm">{t('user.walletEmpty')}</p>
              <p className="text-[10px] uppercase tracking-widest mt-1">{t('user.walletEmptyHint')}</p>
            </div>
          ) : tickets.map((t_ticket,i) => (
            <motion.div key={t_ticket.contractId} initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} transition={{delay:i*0.05}} className="glass-card p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-accent-purple/10 text-accent-purple border-accent-purple/20">
                  {t_ticket.payload.isUsed ? t('user.used') : t('user.active')}
                </span>
                <span className="text-[8px] font-mono text-text-muted bg-bg px-1.5 rounded">#{t_ticket.payload.transferCount}x transfer</span>
              </div>
              <h4 className="font-bold text-sm mb-0.5">{t_ticket.payload.eventName}</h4>
              <p className="text-[10px] text-text-muted font-mono mb-1">{t_ticket.payload.seat}</p>
              <p className="text-[10px] text-text-muted mb-3">{t('user.priceLabel')} <span className="text-accent font-bold">{fmtUsd(t_ticket.payload.currentPrice)}</span></p>
              {!t_ticket.payload.isUsed && (
                <div className="flex gap-2">
                  <button onClick={()=>setSellModal({open:true, ticketCid:t_ticket.contractId, price:Math.round(parseFloat(t_ticket.payload.currentPrice)*1.5)})}
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold border border-accent-purple/40 text-accent-purple hover:bg-accent-purple hover:text-white transition-all">
                    {t('user.resell')}
                  </button>
                  <button onClick={()=>onUseTicket(t_ticket.contractId)}
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold border border-border text-text-muted hover:bg-surface-hover transition-all">
                    {t('user.use')}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Secondary Market */}
      {listings.length > 0 && (
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
            <i className='bx bx-store text-amber-400'></i> {t('user.secondaryMarket')}
          </h3>
          <div className="space-y-3">
            {listings.map(l => {
              const isMine = l.payload.seller === partyId;
              const royalty = parseFloat(l.payload.price) * parseFloat(l.payload.ticket.royaltyPct)/100;
              return (
                <div key={l.contractId} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm">{l.payload.ticket.eventName}</p>
                    <p className="text-[10px] text-text-muted font-mono">{l.payload.ticket.seat} · {t('user.seller')} {l.payload.seller.slice(0,12)}...</p>
                    <p className="text-[10px] text-accent-purple mt-1">Royalty: {fmtUsd(royalty)} ({fmtPct(l.payload.ticket.royaltyPct)})</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-extrabold text-accent">{fmtUsd(l.payload.price)}</span>
                    {isMine ? (
                      <button onClick={()=>onCancelListing(l.contractId)} className="px-4 py-2 rounded-lg text-[10px] font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10">{t('user.cancelListing')}</button>
                    ) : (
                      <button onClick={()=>handleBuySecondary(l.contractId)} className="px-4 py-2 rounded-lg text-[10px] font-bold bg-accent text-black hover:opacity-90 active:scale-95">{t('user.buySecondary')}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sell Modal */}
      <AnimatePresence>
        {sellModal.open && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={()=>setSellModal({...sellModal,open:false})}>
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} onClick={e=>e.stopPropagation()} className="glass-card p-6 w-full max-w-md">
              <h3 className="text-lg font-extrabold mb-4">{t('user.sellModalTitle')}</h3>
              <div className="space-y-3">
                <div className="space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">{t('user.sellPrice')}</label>
                  <input type="number" value={sellModal.price} onChange={e=>setSellModal({...sellModal,price:+e.target.value})} className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none font-mono" min={1}/></div>
                <div className="p-3 bg-bg rounded-lg border border-accent-purple/30">
                  <p className="text-[10px] font-bold text-accent-purple uppercase mb-2">{t('user.autoDistribution')}</p>
                  <div className="flex justify-between text-sm font-mono">
                    <span className="text-text-muted">{t('user.sellerShare')}</span>
                    <span className="text-accent font-bold">{(sellModal.price * 0.85).toFixed(1)} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm font-mono mt-1">
                    <span className="text-text-muted">{t('user.artistRoyalty')}</span>
                    <span className="text-accent-purple font-bold">{(sellModal.price * 0.15).toFixed(1)} USDC</span>
                  </div>
                </div>
                <button onClick={handleList} disabled={isListing} className="w-full btn-primary disabled:opacity-50">
                  {isListing ? <><i className='bx bx-loader-alt animate-spin'></i> {t('user.listProcessing')}</> : t('user.listAdd')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
