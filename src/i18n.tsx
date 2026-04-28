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
  'role.market': { tr: 'MARKET', en: 'MARKET' },
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

  // ═══ MarketPanel.tsx ═══
  'market.title': { tr: 'Market', en: 'Market' },
  'market.subtitle': { tr: 'Birincil ve ikinci el biletleri tek panelde keşfet.', en: 'Discover primary and secondary tickets in one place.' },
  'market.primaryTab': { tr: 'Birincil Satış', en: 'Primary Sales' },
  'market.secondaryTab': { tr: '2. El Biletler', en: 'Resale Tickets' },
  'market.primaryEvents': { tr: 'Aktif Etkinlik', en: 'Active Events' },
  'market.primaryAvgPrice': { tr: 'Ort. Fiyat', en: 'Avg. Price' },
  'market.primaryTotalTickets': { tr: 'Mevcut Bilet', en: 'Available' },
  'market.primaryEmpty': { tr: 'Henüz etkinlik yok', en: 'No events yet' },
  'market.primaryEmptyHint': { tr: 'Organizatör etkinlik oluşturduğunda burada görünecek', en: 'Events will appear here when organizers create them' },
  'market.primaryTicketsLeft': { tr: 'bilet kaldı', en: 'tickets left' },
  'market.primarySoldOut': { tr: 'TÜKENDİ', en: 'SOLD OUT' },
  'market.primaryOfficial': { tr: 'RESMİ', en: 'OFFICIAL' },
  'market.primarySalesProgress': { tr: 'Satış İlerlemesi', en: 'Sales Progress' },
  'market.primaryBuy': { tr: 'Satın Al', en: 'Buy Ticket' },
  'market.primaryBuying': { tr: 'Alınıyor...', en: 'Buying...' },
  'market.primaryBuySuccess': { tr: 'Bilet Alındı!', en: 'Ticket Purchased!' },
  'market.primaryBuySuccessDetail': { tr: 'Birincil satış — Canton üzerinden transfer edildi', en: 'Primary sale — Transferred via Canton' },
  'market.primaryBuyError': { tr: 'Bilet alınamadı', en: 'Could not buy ticket' },
  'market.totalListings': { tr: 'Toplam İlan', en: 'Total Listings' },
  'market.avgPrice': { tr: 'Ortalama Fiyat', en: 'Avg Price' },
  'market.uniqueSellers': { tr: 'Satıcı Sayısı', en: 'Unique Sellers' },
  'market.empty': { tr: 'Henüz listelenen bilet yok', en: 'No tickets listed yet' },
  'market.emptyHint': { tr: 'Kullanıcılar bilet listelediğinde burada görünecek', en: 'Tickets will appear here when users list them' },
  'market.myListing': { tr: 'Benim İlanım', en: 'My Listing' },
  'market.secondHand': { tr: '2. EL', en: '2ND HAND' },
  'market.royalty': { tr: 'royalty', en: 'royalty' },
  'market.originalPrice': { tr: 'Orijinal', en: 'Original' },
  'market.listingPrice': { tr: 'İlan Fiyatı', en: 'Listing' },
  'market.artistRoyalty': { tr: 'Sanatçı Royalty:', en: 'Artist Royalty:' },
  'market.buyNow': { tr: 'Satın Al', en: 'Buy Now' },
  'market.buying': { tr: 'Alınıyor...', en: 'Buying...' },
  'market.makeOffer': { tr: 'Teklif Ver', en: 'Make Offer' },
  'market.offerModalTitle': { tr: 'Teklif Ver', en: 'Make an Offer' },
  'market.offerModalDesc': { tr: 'Bu bilet için bir teklif fiyatı belirleyin.', en: 'Set an offer price for this ticket.' },
  'market.yourOffer': { tr: 'Teklif Fiyatınız (USDC)', en: 'Your Offer (USDC)' },
  'market.offerInfo': { tr: 'Teklif Bilgisi', en: 'Offer Info' },
  'market.offerInfoDetail': { tr: 'Teklifiniz satıcıya iletilecektir. Satıcı kabul ederse işlem Canton üzerinden otomatik gerçekleşir.', en: 'Your offer will be sent to the seller. If accepted, the transaction is executed automatically via Canton.' },
  'market.cancel': { tr: 'Vazgeç', en: 'Cancel' },
  'market.sendOffer': { tr: 'Teklif Gönder', en: 'Send Offer' },
  'market.buySuccess': { tr: 'Bilet Satın Alındı!', en: 'Ticket Purchased!' },
  'market.buySuccessDetail': { tr: 'İkinci el transfer Canton üzerinden gerçekleşti', en: 'Secondary transfer executed via Canton' },
  'market.buyError': { tr: 'Satın alma başarısız', en: 'Purchase failed' },
  'market.offerSent': { tr: 'Teklif Gönderildi!', en: 'Offer Sent!' },
  'market.offerSentDetail': { tr: 'teklif satıcıya iletildi', en: 'offer sent to seller' },
  'market.error': { tr: 'Hata', en: 'Error' },

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
