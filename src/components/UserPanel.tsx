import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';
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
  const { showToast } = useToast();

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
      showToast('🎫', 'Bilet Satın Alındı!', `Primary Sale — Canton üzerinden transfer gerçekleşti`);
    } catch (err: any) {
      showToast('❌', 'Hata', err?.message || 'Bilet alınamadı', 'error');
    } finally {
      setBuying(false);
    }
  };

  const handleList = async () => {
    try {
      await onListForSale(sellModal.ticketCid, sellModal.price);
      showToast('📢', 'İkinci El Listelendi!', `SecondaryListing kontratı oluşturuldu`);
      setSellModal({open:false,ticketCid:'',price:80});
    } catch (err: any) {
      showToast('❌', 'Hata', err?.message || 'Listeleme başarısız', 'error');
    }
  };

  const handleBuySecondary = async (cid: string) => {
    try {
      await onBuySecondary(cid);
      showToast('⚡', 'İkinci El Satın Alındı!', 'Royalty kesintisi yapılarak transfer sağlandı');
    } catch (err: any) {
      showToast('❌', 'Hata', err?.message || 'İşlem başarısız', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
          Etkinlikleri Keşfet <i className='bx bxs-hot text-orange-500'></i>
        </h2>
        <p className="text-text-muted text-sm">Biletini al, ikinci ele sat — royalty otomatik hesaplanır.</p>
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
                    {available ? `${total-sold} bilet kaldı` : 'TÜKENDİ'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-base truncate">{event.payload.name}</h3>
                  <span className="font-mono text-accent font-bold text-sm">{event.payload.price} USDC</span>
                </div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">{event.payload.venue} — {event.payload.date}</p>
                <p className="text-[10px] text-accent-purple mt-1 font-mono">%{event.payload.royaltyPct} royalty → sanatçıya</p>
                {isSelected && available && (
                  <button onClick={(e)=>{e.stopPropagation();handleBuy(event)}} disabled={buying}
                    className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold bg-text-main text-bg hover:bg-accent hover:text-black active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {buying ? <><div className="w-3 h-3 border-2 border-bg border-t-transparent rounded-full animate-spin"/>Satın Alınıyor...</> : <>🎫 Satın Al</>}
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
          <i className='bx bxs-wallet text-accent-purple'></i> Cüzdanım
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {tickets.length === 0 ? (
            <div className="col-span-full py-12 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-text-muted">
              <i className='bx bx-purchase-tag-alt text-5xl mb-3 opacity-10'></i>
              <p className="text-sm">Cüzdanınız boş</p>
              <p className="text-[10px] uppercase tracking-widest mt-1">Yukarıdan bilet satın alın</p>
            </div>
          ) : tickets.map((t,i) => (
            <motion.div key={t.contractId} initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} transition={{delay:i*0.05}} className="glass-card p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-accent-purple/10 text-accent-purple border-accent-purple/20">
                  {t.payload.isUsed ? 'KULLANILDI' : 'AKTİF'}
                </span>
                <span className="text-[8px] font-mono text-text-muted bg-bg px-1.5 rounded">#{t.payload.transferCount}x transfer</span>
              </div>
              <h4 className="font-bold text-sm mb-0.5">{t.payload.eventName}</h4>
              <p className="text-[10px] text-text-muted font-mono mb-1">{t.payload.seat}</p>
              <p className="text-[10px] text-text-muted mb-3">Fiyat: <span className="text-accent font-bold">{t.payload.currentPrice} USDC</span></p>
              {!t.payload.isUsed && (
                <div className="flex gap-2">
                  <button onClick={()=>setSellModal({open:true, ticketCid:t.contractId, price:Math.round(parseFloat(t.payload.currentPrice)*1.5)})}
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold border border-accent-purple/40 text-accent-purple hover:bg-accent-purple hover:text-white transition-all">
                    İkinci El Sat
                  </button>
                  <button onClick={()=>onUseTicket(t.contractId)}
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold border border-border text-text-muted hover:bg-surface-hover transition-all">
                    Kullan
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
            <i className='bx bx-store text-amber-400'></i> İkinci El Piyasası
          </h3>
          <div className="space-y-3">
            {listings.map(l => {
              const isMine = l.payload.seller === partyId;
              const royalty = parseFloat(l.payload.price) * parseFloat(l.payload.ticket.royaltyPct)/100;
              return (
                <div key={l.contractId} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm">{l.payload.ticket.eventName}</p>
                    <p className="text-[10px] text-text-muted font-mono">{l.payload.ticket.seat} · Satıcı: {l.payload.seller.slice(0,12)}...</p>
                    <p className="text-[10px] text-accent-purple mt-1">Royalty: {royalty.toFixed(1)} USDC (%{l.payload.ticket.royaltyPct})</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-extrabold text-accent">{l.payload.price} USDC</span>
                    {isMine ? (
                      <button onClick={()=>onCancelListing(l.contractId)} className="px-4 py-2 rounded-lg text-[10px] font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10">İptal</button>
                    ) : (
                      <button onClick={()=>handleBuySecondary(l.contractId)} className="px-4 py-2 rounded-lg text-[10px] font-bold bg-accent text-black hover:opacity-90 active:scale-95">Satın Al</button>
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
              <h3 className="text-lg font-extrabold mb-4">İkinci El Satışa Çıkar</h3>
              <div className="space-y-3">
                <div className="space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Satış Fiyatı (USDC)</label>
                  <input type="number" value={sellModal.price} onChange={e=>setSellModal({...sellModal,price:+e.target.value})} className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none font-mono" min={1}/></div>
                <div className="p-3 bg-bg rounded-lg border border-accent-purple/30">
                  <p className="text-[10px] font-bold text-accent-purple uppercase mb-2">Canton Otomatik Dağılım</p>
                  <div className="flex justify-between text-sm font-mono">
                    <span className="text-text-muted">Satıcı payı:</span>
                    <span className="text-accent font-bold">{(sellModal.price * 0.85).toFixed(1)} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm font-mono mt-1">
                    <span className="text-text-muted">Sanatçı royalty:</span>
                    <span className="text-accent-purple font-bold">{(sellModal.price * 0.15).toFixed(1)} USDC</span>
                  </div>
                </div>
                <button onClick={handleList} className="w-full btn-primary">📢 Listeye Ekle</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
