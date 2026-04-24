import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';
import { DynamicLighting } from './DynamicLighting';
import type { EventContract } from '../services/damlLedger';

interface Props {
  events: EventContract[];
  onCreateEvent: (data: any) => Promise<void>;
  onCancelEvent: (cid: string) => Promise<void>;
  partyId: string;
}

export const OrganizerPanel = ({ events, onCreateEvent, onCancelEvent, partyId }: Props) => {
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: 'İstanbul Konseri 2025', date: '2025-09-15', venue: 'Zorlu PSM',
    totalTickets: 100, price: 50, royaltyPct: 15, maxResale: 3, hasMaxResale: true,
  });

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await Promise.race([
        onCreateEvent({
          name: form.name, date: form.date, venue: form.venue,
          totalTickets: form.totalTickets, price: form.price, royaltyPct: form.royaltyPct,
          maxResaleMultiplier: form.hasMaxResale ? form.maxResale : null,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('İşlem zaman aşımına uğradı. DevNet yavaş/erişilemez veya yetki gerekiyor.')), 45_000)
        ),
      ]);
      showToast('✅', 'Etkinlik Oluşturuldu!', `"${form.name}" Canton Ledger'a yazıldı`);
      setShowForm(false);
    } catch (err: any) {
      showToast('❌', 'Hata', err?.message || 'İşlem reddedildi', 'error');
    }
    setIsCreating(false);
  };

  const totalSold = events.reduce((a, e) => a + Number(e.payload.ticketsSold || 0), 0);
  const totalSupply = events.reduce((a, e) => a + Number(e.payload.totalTickets || 0), 0);
  const totalRevenue = events.reduce((a, e) => a + Number(e.payload.ticketsSold || 0) * parseFloat(e.payload.price || '0'), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
            Organizatör Paneli <i className='bx bxs-badge-check text-accent'></i>
          </h2>
          <p className="text-text-muted text-sm">Etkinlik oluştur, royalty standartlarını belirle.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
          <i className={`bx ${showForm ? 'bx-minus' : 'bx-plus'} text-lg`}></i> Etkinlik Oluştur
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Kazanç', value: `₮${totalRevenue}`, color: 'text-accent' },
          { label: 'Satılan Bilet', value: `${totalSold}`, color: 'text-accent-purple' },
          { label: 'Toplam Arz', value: `${totalSupply}`, color: 'text-text-main' },
          { label: 'Aktif Etkinlik', value: `${events.filter(e => !e.payload.isCancelled).length}`, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 hover:border-accent/30 transition-all">
            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-2">{s.label}</p>
            <p className={`text-2xl font-extrabold tracking-tight ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="glass-card p-6 overflow-hidden">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
              <i className='bx bx-cube text-accent-purple'></i> Yeni Etkinlik
              {partyId && <span className="text-[8px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-mono">CANLI</span>}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Etkinlik Adı</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none font-mono" /></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Mekan</label>
                <input value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none font-mono" /></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Tarih</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none font-mono" /></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Bilet Sayısı</label>
                <input type="number" value={form.totalTickets} onChange={e => setForm({...form, totalTickets: +e.target.value})} className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none font-mono" min={1} /></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Fiyat (USDC)</label>
                <input type="number" value={form.price} onChange={e => setForm({...form, price: +e.target.value})} className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none font-mono" min={1} /></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Royalty: %{form.royaltyPct}</label>
                <input type="range" min={0} max={50} value={form.royaltyPct} onChange={e => setForm({...form, royaltyPct: +e.target.value})} className="w-full accent-accent" /></div>
              <button onClick={handleCreate} disabled={isCreating} className="sm:col-span-2 btn-primary bg-accent-purple text-white hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-40">
                {isCreating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Yazılıyor...</> : <><i className='bx bxs-rocket'></i> Canton'a Deploy Et</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map(event => {
          const sold = event.payload.ticketsSold || 0, total = event.payload.totalTickets || 0;
          const cancelled = event.payload.isCancelled;
          return (
            <DynamicLighting key={event.contractId} intensity={0.08}>
              <div className={`glass-card p-5 h-full ${cancelled ? 'opacity-50' : 'hover:border-accent/40'} transition-all`}>
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${cancelled ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-accent/10 text-accent border-accent/20'}`}>
                    {cancelled ? 'İPTAL' : `%${event.payload.royaltyPct} ROYALTY`}
                  </span>
                  <p className="text-xs font-bold text-accent">{event.payload.price} USDC</p>
                </div>
                <h3 className="text-lg font-bold mb-1">{event.payload.name}</h3>
                <p className="text-[10px] text-text-muted mb-3"><i className='bx bx-map-pin text-accent'></i> {event.payload.venue} · {event.payload.date}</p>
                <div className="p-2 bg-bg border border-border rounded-lg mb-3 text-[8px] font-mono text-text-muted">
                  CID: <span className="text-accent">{event.contractId.slice(0, 20)}...</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold mb-1">
                  <span>Satış</span><span className={Number(sold)>=Number(total)?'text-red-500':'text-accent'}>{sold}/{total}</span>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden border border-border">
                  <motion.div initial={{width:0}} animate={{width:`${Number(total)>0?(Number(sold)/Number(total))*100:0}%`}} className={`h-full ${Number(sold)>=Number(total)?'bg-red-500':'bg-accent'}`}/>
                </div>
                {!cancelled && sold===0 && (
                  <button onClick={()=>onCancelEvent(event.contractId)} className="mt-3 w-full py-2 rounded-lg text-[10px] font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all">İptal Et</button>
                )}
              </div>
            </DynamicLighting>
          );
        })}
      </div>
    </div>
  );
};
