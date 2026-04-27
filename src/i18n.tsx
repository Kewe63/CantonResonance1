/**
 * Canton Resonance — Internationalization (i18n)
 * Supports Turkish (tr) and English (en) languages.
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Lang = 'tr' | 'en';

const translations = {
  // ═══ App.tsx — Navigation & Global ═══
  'role.organizer': { tr: 'ORGANİZATÖR', en: 'ORGANIZER' },
  'role.user': { tr: 'KULLANICI', en: 'USER' },
  'role.artist': { tr: 'SANATÇI', en: 'ARTIST' },
  'nav.activeIdentity': { tr: 'Aktif Kimlik', en: 'Active Identity' },
  'nav.connecting': { tr: 'Bağlanıyor...', en: 'Connecting...' },
  'nav.disconnect': { tr: 'Bağlantıyı Kes', en: 'Disconnect' },
  'nav.noConnection': { tr: 'Bağlantı Yok', en: 'Not Connected' },
  'nav.connectionRequired': { tr: 'Bağlantı Gerekli', en: 'Connection Required' },
  'toast.eventCreated': { tr: 'Etkinlik Oluşturuldu!', en: 'Event Created!' },
  'toast.eventCreatedDetail': { tr: 'Canton\'a deploy edildi', en: 'Deployed to Canton' },
  'toast.eventCancelled': { tr: 'Etkinlik İptal Edildi', en: 'Event Cancelled' },
  'toast.eventCancelledDetail': { tr: 'Event kontratı iptal edildi', en: 'Event contract archived' },
  'toast.ticketUsed': { tr: 'Bilet Kullanıldı', en: 'Ticket Used' },
  'toast.ticketUsedDetail': { tr: 'Etkinliğe giriş kaydedildi', en: 'Entry recorded for event' },

  // ═══ WalletLogin.tsx ═══
  'login.title': { tr: 'Canton Hackathon — Bilet Platformu', en: 'Canton Hackathon — Ticket Platform' },
  'login.sandboxTitle': { tr: 'Sandbox Girişi', en: 'Sandbox Login' },
  'login.sandboxDesc': { tr: 'Lokal Canton sandbox\'a bağlanın. Bir rol seçin:', en: 'Connect to local Canton sandbox. Choose a role:' },
  'login.sandboxInfo': { tr: 'Sandbox localhost:7575\'te çalışıyor olmalı.', en: 'Sandbox must be running on localhost:7575.' },
  'login.sandboxInfoAction': { tr: 'veya Docker ile başlatın.', en: 'or start with Docker.' },
  'login.devnetTitle': { tr: 'DevNet Girişi', en: 'DevNet Login' },
  'login.email': { tr: 'E-Posta', en: 'Email' },
  'login.password': { tr: 'Şifre', en: 'Password' },
  'login.connecting': { tr: 'Bağlanıyor...', en: 'Connecting...' },
  'login.keycloakLogin': { tr: 'Keycloak ile Giriş Yap', en: 'Login with Keycloak' },
  'login.missingInfo': { tr: 'Eksik Bilgi', en: 'Missing Info' },
  'login.missingInfoDetail': { tr: 'Lütfen e-posta ve şifrenizi girin.', en: 'Please enter your email and password.' },
  'login.connectionError': { tr: 'Bağlantı Hatası', en: 'Connection Error' },
  'login.loginError': { tr: 'Giriş Hatası', en: 'Login Error' },
  'login.loginFailed': { tr: 'Giriş başarısız.', en: 'Login failed.' },
  'login.connected': { tr: 'Bağlantı Kuruldu', en: 'Connected' },
  'login.connectedDetail': { tr: 'Sandbox\'a bağlandınız', en: 'Connected to Sandbox' },
  'login.connError': { tr: 'Bağlantı Hatası', en: 'Connection Error' },
  'login.unknownError': { tr: 'Bilinmeyen hata', en: 'Unknown error' },
  'login.sandboxFailed': { tr: 'Sandbox bağlantısı başarısız', en: 'Sandbox connection failed' },
  'login.partyOrganizer': { tr: 'Organizatör', en: 'Organizer' },
  'login.partyAlice': { tr: 'Alice (Kullanıcı)', en: 'Alice (User)' },
  'login.partyBob': { tr: 'Bob (Kullanıcı)', en: 'Bob (User)' },
  'login.partyArtist': { tr: 'Sanatçı', en: 'Artist' },
  'login.error': { tr: 'Hata', en: 'Error' },

  // ═══ OrganizerPanel.tsx ═══
  'org.title': { tr: 'Organizatör Paneli', en: 'Organizer Panel' },
  'org.subtitle': { tr: 'Etkinlik oluştur, royalty standartlarını belirle.', en: 'Create events, set royalty standards.' },
  'org.createEvent': { tr: 'Etkinlik Oluştur', en: 'Create Event' },
  'org.totalRevenue': { tr: 'Toplam Kazanç', en: 'Total Revenue' },
  'org.ticketsSold': { tr: 'Satılan Bilet', en: 'Tickets Sold' },
  'org.totalSupply': { tr: 'Toplam Arz', en: 'Total Supply' },
  'org.activeEvents': { tr: 'Aktif Etkinlik', en: 'Active Events' },
  'org.newEvent': { tr: 'Yeni Etkinlik', en: 'New Event' },
  'org.live': { tr: 'CANLI', en: 'LIVE' },
  'org.eventName': { tr: 'Etkinlik Adı', en: 'Event Name' },
  'org.venue': { tr: 'Mekan', en: 'Venue' },
  'org.date': { tr: 'Tarih', en: 'Date' },
  'org.ticketCount': { tr: 'Bilet Sayısı', en: 'Ticket Count' },
  'org.price': { tr: 'Fiyat (USDC)', en: 'Price (USDC)' },
  'org.deploying': { tr: 'Yazılıyor...', en: 'Writing...' },
  'org.deploy': { tr: 'Canton\'a Deploy Et', en: 'Deploy to Canton' },
  'org.cancelled': { tr: 'İPTAL', en: 'CANCELLED' },
  'org.sales': { tr: 'Satış', en: 'Sales' },
  'org.cancel': { tr: 'İptal Et', en: 'Cancel' },
  'org.timeout': { tr: 'İşlem zaman aşımına uğradı. DevNet yavaş/erişilemez veya yetki gerekiyor.', en: 'Operation timed out. DevNet slow/unreachable or authorization required.' },
  'org.createError': { tr: 'İşlem reddedildi', en: 'Operation rejected' },

  // ═══ UserPanel.tsx ═══
  'user.title': { tr: 'Etkinlikleri Keşfet', en: 'Discover Events' },
  'user.subtitle': { tr: 'Biletini al, ikinci ele sat — royalty otomatik hesaplanır.', en: 'Buy your ticket, resell — royalty is calculated automatically.' },
  'user.ticketsLeft': { tr: 'bilet kaldı', en: 'tickets left' },
  'user.soldOut': { tr: 'TÜKENDİ', en: 'SOLD OUT' },
  'user.royaltyToArtist': { tr: 'royalty → sanatçıya', en: 'royalty → artist' },
  'user.buying': { tr: 'Satın Alınıyor...', en: 'Buying...' },
  'user.buy': { tr: 'Satın Al', en: 'Buy' },
  'user.wallet': { tr: 'Cüzdanım', en: 'My Wallet' },
  'user.walletEmpty': { tr: 'Cüzdanınız boş', en: 'Your wallet is empty' },
  'user.walletEmptyHint': { tr: 'Yukarıdan bilet satın alın', en: 'Buy a ticket from above' },
  'user.used': { tr: 'KULLANILDI', en: 'USED' },
  'user.active': { tr: 'AKTİF', en: 'ACTIVE' },
  'user.priceLabel': { tr: 'Fiyat:', en: 'Price:' },
  'user.resell': { tr: 'İkinci El Sat', en: 'Resell' },
  'user.use': { tr: 'Kullan', en: 'Use' },
  'user.secondaryMarket': { tr: 'İkinci El Piyasası', en: 'Secondary Market' },
  'user.seller': { tr: 'Satıcı:', en: 'Seller:' },
  'user.cancelListing': { tr: 'İptal', en: 'Cancel' },
  'user.buySecondary': { tr: 'Satın Al', en: 'Buy' },
  'user.sellModalTitle': { tr: 'İkinci El Satışa Çıkar', en: 'List for Resale' },
  'user.sellPrice': { tr: 'Satış Fiyatı (USDC)', en: 'Listing Price (USDC)' },
  'user.autoDistribution': { tr: 'Canton Otomatik Dağılım', en: 'Canton Auto Distribution' },
  'user.sellerShare': { tr: 'Satıcı payı:', en: 'Seller share:' },
  'user.artistRoyalty': { tr: 'Sanatçı royalty:', en: 'Artist royalty:' },
  'user.listProcessing': { tr: 'İşleniyor...', en: 'Processing...' },
  'user.listAdd': { tr: '📢 Listeye Ekle', en: '📢 Add Listing' },
  'user.ticketBought': { tr: 'Bilet Satın Alındı!', en: 'Ticket Purchased!' },
  'user.ticketBoughtDetail': { tr: 'Primary Sale — Canton üzerinden transfer gerçekleşti', en: 'Primary Sale — Transfer executed via Canton' },
  'user.ticketBuyError': { tr: 'Bilet alınamadı', en: 'Could not buy ticket' },
  'user.listed': { tr: 'İkinci El Listelendi!', en: 'Listed on Secondary Market!' },
  'user.listedDetail': { tr: 'SecondaryListing kontratı oluşturuldu', en: 'SecondaryListing contract created' },
  'user.listError': { tr: 'Listeleme başarısız', en: 'Listing failed' },
  'user.secondaryBought': { tr: 'İkinci El Satın Alındı!', en: 'Secondary Purchase Complete!' },
  'user.secondaryBoughtDetail': { tr: 'Royalty kesintisi yapılarak transfer sağlandı', en: 'Transfer completed with royalty deduction' },
  'user.secondaryBuyError': { tr: 'İşlem başarısız', en: 'Transaction failed' },
  'user.error': { tr: 'Hata', en: 'Error' },

  // ═══ ArtistPanel.tsx ═══
  'artist.title': { tr: 'Sanatçı Panosu', en: 'Artist Dashboard' },
  'artist.subtitle': { tr: 'Birincil bilet satışlarından ve ikinci el transferlerden elde edilen toplam gelir.', en: 'Total earnings from primary ticket sales and secondary transfers.' },
  'artist.totalEarnings': { tr: 'Toplam Kazanç', en: 'Total Earnings' },
  'artist.primary': { tr: 'Birincil:', en: 'Primary:' },
  'artist.secondary': { tr: 'İkinci El:', en: 'Secondary:' },
  'artist.totalTicketSales': { tr: 'Toplam Bilet Satışı', en: 'Total Ticket Sales' },
  'artist.primarySales': { tr: 'Birincil Satış', en: 'Primary Sales' },
  'artist.secondaryTransfer': { tr: 'İkinci El Transfer', en: 'Secondary Transfer' },
  'artist.avgEarnings': { tr: 'Ortalama Kazanç', en: 'Avg. Earnings' },
  'artist.perTicket': { tr: 'Bilet/İşlem başına', en: 'Per ticket/transaction' },
  'artist.secondaryEarnings': { tr: 'İkinci El Kazanç', en: 'Secondary Earnings' },
  'artist.salesCount': { tr: 'satış', en: 'sales' },
  'artist.royaltyIncome': { tr: 'royalty geliri', en: 'royalty income' },
  'artist.myEvents': { tr: 'Etkinliklerim (İlk Satış)', en: 'My Events (Primary Sales)' },
  'artist.ticket': { tr: 'Bilet:', en: 'Ticket:' },
  'artist.artistShare': { tr: 'Sanatçı Payı:', en: 'Artist Share:' },
  'artist.perTicketShort': { tr: '/bilet', en: '/ticket' },
  'artist.sold': { tr: 'Satılan', en: 'Sold' },
  'artist.ticketUnit': { tr: 'Bilet', en: 'Tickets' },
  'artist.totalEarningsLabel': { tr: 'toplam kazanç', en: 'total earnings' },
  'artist.cancelledBadge': { tr: 'İPTAL', en: 'CANCELLED' },
  'artist.royaltyReceipts': { tr: 'Royalty Makbuzları', en: 'Royalty Receipts' },
  'artist.noRoyalty': { tr: 'Henüz royalty kazancı yok', en: 'No royalty earnings yet' },
  'artist.noRoyaltyHint': { tr: 'İkinci el satışlar başladığında buraya düşecek', en: 'Will appear here when secondary sales begin' },
  'artist.rate': { tr: 'oran', en: 'rate' },
  'artist.sale': { tr: 'satış:', en: 'sale:' },
  'artist.autoDistribution': { tr: 'Smart Contract ile otomatik dağıtım', en: 'Automatic distribution via Smart Contract' },

  // ═══ LedgerFeed.tsx ═══
  'feed.liveFeed': { tr: 'CANLI PROTOKOL FEED', en: 'LIVE PROTOCOL FEED' },
  'feed.recording': { tr: 'KAYIT', en: 'REC' },
  'feed.waiting': { tr: 'Ledger bekleniyor...', en: 'Waiting for ledger...' },
  'feed.ticketUnit': { tr: 'bilet', en: 'tickets' },
  'feed.toArtist': { tr: '→ Sanatçı', en: '→ Artist' },
  'feed.protocolActivity': { tr: 'Protokol Aktivitesi', en: 'Protocol Activity' },
  'feed.totalTicketSales': { tr: 'Toplam Bilet Satışı', en: 'Total Ticket Sales' },
  'feed.secondaryTransfer': { tr: 'İkinci El Transfer', en: 'Secondary Transfer' },
  'feed.royaltyTransaction': { tr: 'Royalty İşlemi', en: 'Royalty Transaction' },
  'feed.distributedRoyalty': { tr: 'Dağıtılan Royalty', en: 'Distributed Royalty' },
  'feed.paidToArtists': { tr: 'Sanatçılara Ödenen', en: 'Paid to Artists' },
} as const;

export type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'tr',
  setLang: () => {},
  t: (key) => key,
});

export const useI18n = () => useContext(I18nContext);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('canton-lang');
      if (saved === 'en' || saved === 'tr') return saved;
    } catch {}
    return 'tr';
  });

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    try { localStorage.setItem('canton-lang', newLang); } catch {}
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry['tr'] || key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};
