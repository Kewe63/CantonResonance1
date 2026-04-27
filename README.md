![Daml SDK](https://img.shields.io/badge/Daml%20SDK-2.10.4-blue)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)
![License](https://img.shields.io/badge/license-private-red)
![Version](https://img.shields.io/badge/version-0.1.0-orange)

---

# 🎫 Canton Resonance
 
> **A high-performance event ticketing and royalty settlement platform built on the Canton Network.**
 
Canton Resonance; etkinlik biletlerini, sanatçı telif ödemelerini ve organizatör–alıcı iş akışlarını **Daml akıllı sözleşmeleri** ile yönetir. Arka planda Canton Sandbox (yerel geliştirme) veya Canton DevNet (canlı ağ) ile çalışır. Ön yüz **React 19 + Vite**, arka uç **Express + TypeScript** ile yazılmıştır.
 
---
 
## 📋 İçindekiler
 
- [Proje Adı ve Açıklama](#-canton-resonance)
- [Özellikler](#-özellikler)
- [Gereksinimler](#-gereksinimler)
- [Kurulum](#-kurulum)
- [Konfigürasyon (.env)](#-konfigürasyon-env)
- [Kullanım](#-kullanım)
- [Proje Yapısı](#-proje-yapısı)
- [API Referansı](#-api-referansı)
- [Docker ile Çalıştırma](#-docker-ile-çalıştırma)
- [Daml Akıllı Sözleşmeleri](#-daml-akıllı-sözleşmeleri)
- [Ekran Görüntüleri / Demo](#-ekran-görüntüleri--demo)
- [Katkıda Bulunma](#-katkıda-bulunma)
- [Lisans](#-lisans)
- [İletişim / Destek](#-iletişim--destek)
- [Roadmap](#-roadmap)
- [Changelog](#-changelog)
- [Acknowledgements](#-acknowledgements)
---
 
## ✨ Özellikler
 
- **Daml Akıllı Sözleşmeleri** — `Ticket` ve `Event` şablonlarıyla güvenli, denetlenebilir iş mantığı
- **Canton Sandbox Desteği** — İmzasız JWT ile yerel geliştirme; harici cüzdana gerek yok
- **Canton DevNet Desteği** — Signed Bearer token ile canlı ağ entegrasyonu
- **Bridge Katmanı** — Ledger API v2 (`/v2/commands/submit-and-wait`, `/v2/state/active-contracts`) endpoint'lerini eski JSON API formatına dönüştürür
- **Dinamik Package ID Çözümü** — Derleme çıktısından otomatik `packageId` okuma
- **Party Yönetimi** — Sandbox'ta otomatik parti oluşturma ve Admin token üretimi
- **React 19 UI** — Tailwind CSS v4 + Motion animasyon + Lucide ikonları
- **Gemini AI Entegrasyonu** — `@google/genai` SDK üzerinden AI destekli öneriler
- **Ethers.js v6** — Opsiyonel zincir bağlantısı için dahil
- **Docker + Docker Compose** — Tek komutla sandbox ortamı
---
 
## 🛠 Gereksinimler
 
| Bağımlılık | Versiyon |
|---|---|
| Node.js | ≥ 18.x (ESM desteği) |
| npm | ≥ 9.x |
| Daml SDK | 2.10.4 |
| Docker | ≥ 24.x (Docker kurulumu opsiyonel, sadece sandbox Docker için) |
| Docker Compose | ≥ 2.x |
 
> **Not:** Daml SDK kurulumu için → [docs.daml.com](https://docs.daml.com/getting-started/installation.html)
 
---
 
## 📦 Kurulum
 
### 1. Repoyu klonla
 
```bash
git clone https://github.com/Kewe63/CantonResonance1.git
cd CantonResonance1
```
 
### 2. Bağımlılıkları yükle
 
```bash
npm install
```
 
### 3. Ortam değişkenlerini ayarla
 
```bash
cp .env.example .env
# .env dosyasını düzenle (aşağıdaki Konfigürasyon bölümüne bak)
```
 
### 4. Daml kodunu derle (Daml SDK kuruluysa)
 
```bash
daml build
daml codegen js .daml/dist/canton-ticket-0.1.0.dar -o src/daml.js
```
 
### 5. Geliştirme sunucusunu başlat
 
```bash
npm run dev
```
 
Uygulama `http://localhost:3000` adresinde çalışır.
 
---
 
## ⚙️ Konfigürasyon (.env)
 
`.env.example` dosyasını kopyalayarak `.env` oluştur:
 
```env
# Canton Resonance 2.0 - Environment Variables
 
# --- PRODUCTION / DEVNET AYARLARI ---
# Eğer Canton DevNet'e bağlanıyorsanız bu değerleri doldurun:
CANTON_JSON_API_URL="https://api.your-canton-node.com"
CANTON_JWT_TOKEN="your-signed-jwt-token"
CANTON_PARTY_ID="your-party-id"
 
# --- YEREL GELİŞTİRME ---
# Yerel sandbox için bu değerlere gerek yok.
# Uygulama varsayılan olarak http://localhost:7575 kullanır
# ve imzasız sandbox tokenları üretir.
 
# Node sunucu portu (varsayılan: 3000)
PORT=3000
```
 
| Değişken | Açıklama | Zorunlu mu? |
|---|---|---|
| `CANTON_JSON_API_URL` | Canton JSON API endpoint | Sadece DevNet için |
| `CANTON_JWT_TOKEN` | İmzalı JWT token | Sadece DevNet için |
| `CANTON_PARTY_ID` | Canton parti kimliği | Sadece DevNet için |
| `PORT` | Express sunucu portu | Hayır (varsayılan: 3000) |
 
> Yerel sandbox modunda hiçbir değişken doldurulmadan da çalışır.
 
---
 
## 🚀 Kullanım
 
### Temel kullanım — Yerel sandbox
 
```bash
# 1. Sandbox'ı Docker ile başlat
docker-compose up -d
 
# 2. Uygulamayı başlat
npm run dev
 
# 3. Tarayıcıda aç
open http://localhost:3000
```
 
### Mevcut npm scriptleri
 
| Script | Açıklama |
|---|---|
| `npm run dev` | Vite + Express geliştirme sunucusunu başlatır |
| `npm run build` | Production build oluşturur (`dist/`) |
| `npm run preview` | Production build'i önizler |
| `npm run lint` | TypeScript tip kontrolü yapar (`tsc --noEmit`) |
| `npm run clean` | `dist/` klasörünü temizler |
 
### Uygulama akışı
 
1. Kullanıcı UI'da oturum açar (party seçer veya oluşturur)
2. Organizatör `Event` kontratı oluşturur → Daml `create` komutu
3. Alıcı bilet satın alır → `Transfer` choice çalıştırılır
4. Royalty ödemesi → `RoyaltySettle` choice ile sanatçıya iletilir
5. Aktif kontratlar `/api/canton/query` üzerinden listelenir
---
 
## 📁 Proje Yapısı
 
```
CantonResonance1/
│
├── daml/                          # Daml akıllı sözleşmeleri
│   ├── Ticket.daml                # Bilet şablonu
│   ├── Event.daml                 # Etkinlik şablonu
│   └── Setup.daml                 # Init scripti (daml start)
│
├── src/                           # React ön yüz
│   ├── daml.js/                   # Daml codegen çıktısı (JS binding'leri)
│   ├── components/                # React bileşenleri
│   ├── hooks/                     # Custom React hook'ları
│   ├── pages/                     # Sayfa bileşenleri
│   └── main.tsx                   # Uygulama giriş noktası
│
├── server.ts                      # Express sunucu + Canton proxy/bridge
├── vite.config.ts                 # Vite yapılandırması
├── tsconfig.json                  # TypeScript yapılandırması
├── daml.yaml                      # Daml proje tanımı (SDK 2.10.4)
├── canton-sandbox.conf            # Canton sandbox ayarları
├── docker-compose.yml             # Sandbox Docker servisi
├── Dockerfile                     # Uygulama Docker imajı
├── Dockerfile.sandbox             # Sandbox Docker imajı
├── entrypoint.sh                  # Docker entrypoint scripti
├── metadata.json                  # Proje meta verisi
├── .env.example                   # Ortam değişkenleri şablonu
├── .gitignore
├── index.html                     # HTML giriş noktası
└── package.json
```
 
---
 
## 🔌 API Referansı
 
Tüm endpoint'ler `http://localhost:3000` üzerinde çalışır.
 
### Express REST API
 
| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/api/test` | Sunucu sağlık kontrolü |
| `GET` | `/api/package-id` | Daml codegen'den `packageId` okur |
| `GET` | `/api/canton/parties` | Sandbox'taki tüm parti listesi |
| `POST` | `/api/canton/allocate-party` | Yeni parti oluşturur |
| `GET` | `/api/canton/health` | Canton JSON API bağlantı testi |
| `POST` | `/api/canton/query` | Aktif kontratları sorgular |
| `POST` | `/api/canton/create` | Yeni kontrat oluşturur |
| `POST` | `/api/canton/exercise` | Kontrat choice'u çalıştırır |
| `POST` | `/api/debug-log` | İstemci hata logları (geliştirme) |
 
### Bridge API (DevNet)
 
`/bridge/:action` — Ledger API v2'yi eski JSON API formatına köprüler.
 
| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/bridge/packages` | Yüklü paket ID'lerini listeler |
| `POST` | `/bridge/upload-dar` | DAR dosyasını DevNet'e yükler |
| `POST` | `/bridge/query` | Aktif kontratları sorgular (v2 format) |
| `POST` | `/bridge/create` | Kontrat oluşturur, package ID fallback destekli |
| `POST` | `/bridge/exercise` | Choice çalıştırır |
 
#### Örnek: Kontrat Oluşturma
 
```bash
curl -X POST http://localhost:3000/api/canton/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <sandbox-token>" \
  -d '{
    "templateId": "<packageId>:Ticket:Event",
    "payload": {
      "organizer": "Alice::sandbox",
      "artist": "Bob::sandbox",
      "title": "Rock Konseri",
      "date": "2026-06-15"
    }
  }'
```
 
#### Örnek: Kontrat Sorgulama
 
```bash
curl -X POST http://localhost:3000/api/canton/query \
  -H "Content-Type: application/json" \
  -d '{
    "templateIds": ["<packageId>:Ticket:Event"]
  }'
```
 
### Canton JSON API Port Haritası
 
| Port | Protokol | Açıklama |
|---|---|---|
| `3000` | HTTP | Express uygulama sunucusu |
| `6865` | gRPC | Canton Ledger API |
| `7575` | HTTP | Canton JSON API |
 
---
 
## 🐳 Docker ile Çalıştırma
 
### Sandbox'ı Docker ile başlat
 
```bash
docker-compose up -d
```
 
`docker-compose.yml` içeriği:
- **sandbox** servisi: Daml 2.10.4 sandbox'ı Linux üzerinde çalıştırır
- Port `6865` (gRPC) ve `7575` (JSON API) dışarıya açılır
### Sandbox loglarını takip et
 
```bash
docker-compose logs -f sandbox
```
 
### Durdur ve temizle
 
```bash
docker-compose down
docker-compose down -v  # Volume'ları da sil
```
 
### Sadece uygulamayı Docker ile çalıştır
 
```bash
docker build -t canton-resonance .
docker run -p 3000:3000 --env-file .env canton-resonance
```
 
---
 
## 📜 Daml Akıllı Sözleşmeleri
 
### Proje Tanımı (`daml.yaml`)
 
```yaml
sdk-version: 2.10.4
name: canton-ticket
source: daml
version: 0.1.0
dependencies:
  - daml-prim
  - daml-stdlib
  - daml-script
init-script: Setup:setup
codegen:
  js:
    output-directory: src/daml.js
```
 
### Daml Komutları
 
```bash
# Proje derle
daml build
 
# Sandbox başlat (otomatik setup scripti çalışır)
daml start
 
# JS binding'lerini üret
daml codegen js .daml/dist/canton-ticket-0.1.0.dar -o src/daml.js
 
# Daml REPL (interaktif)
daml repl .daml/dist/canton-ticket-0.1.0.dar
```
 
### Sandbox Token (İmzasız)
 
Yerel geliştirmede sunucu otomatik imzasız JWT üretir:
 
```
Header: { alg: "none", typ: "JWT" }
Payload: {
  "https://daml.com/ledger-api": {
    "ledgerId": "sandbox",
    "applicationId": "canton-ticket-app",
    "admin": true,
    "actAs": ["Alice::sandbox"],
    "readAs": ["Alice::sandbox"]
  }
}
```
 
### Releases
 
| Sürüm | DAR Adı | Tarih |
|---|---|---|
| 0.1.0 | canton-ticket-0.1.0 (LF 2.2) | Nisan 2026 |
 
---
 
## 🖥 Ekran Görüntüleri / Demo
 
> Ekran görüntüleri ve canlı demo yakında eklenecek.
>
> Yerel demo için: `npm run dev` → `http://localhost:3000`
 
---
 
## 🤝 Katkıda Bulunma
 
Her türlü katkıya açığız! Aşağıdaki adımları izleyin:
 
1. Bu repoyu fork'layın
2. Feature branch oluşturun:
   ```bash
   git checkout -b feat/özellik-adı
   ```
3. Değişikliklerinizi commit'leyin:
   ```bash
   git commit -m "feat: açıklayıcı commit mesajı"
   ```
4. Branch'i push'layın:
   ```bash
   git push origin feat/özellik-adı
   ```
5. Pull Request açın
### Kod Standartları
 
- TypeScript strict modu aktif (`tsc --noEmit` ile kontrol et)
- ESM modül formatı kullan (`"type": "module"` zorunlu)
- Yeni API endpoint'leri `server.ts`'e, Daml şablonları `daml/` klasörüne eklenir
- Commit mesajları [Conventional Commits](https://www.conventionalcommits.org/) formatında olmalı
### Issue Açma
 
Bug veya özellik isteği için [GitHub Issues](https://github.com/Kewe63/CantonResonance1/issues) kullanın. Issue açarken:
- Ortamı belirtin (yerel sandbox mı, DevNet mi?)
- Hata mesajını ekleyin
- Adım adım yeniden üretme talimatları ekleyin
---
 
## 📄 Lisans
 
Bu proje şu an için özel bir lisans belirtmemiştir. Kullanım öncesinde repo sahibiyle iletişime geçin.
 
---
 
## 📬 İletişim / Destek
 
- **GitHub:** [@Kewe63](https://github.com/Kewe63)
- **Issues:** [GitHub Issues](https://github.com/Kewe63/CantonResonance1/issues)
- **Canton Geliştirici Topluluğu:** [discuss.daml.com](https://discuss.daml.com)
---
 
 
## 🗺 Roadmap
 
- [ ] Kullanıcı kimlik doğrulama UI'ı (DevNet JWT login akışı)
- [ ] Bilet transferi ve ikincil piyasa desteği
- [ ] Royalty otomatik dağıtım akışı
- [ ] Canton DevNet'te çoklu parti desteği
- [ ] Mobil uyumlu responsive tasarım
- [ ] End-to-end test altyapısı (Playwright)
- [ ] GitHub Actions CI/CD pipeline
- [ ] Canlı demo deployment (Vercel / Railway)
---
 
## 📝 Changelog
 
### v0.1.0 — Nisan 2026
- İlk stabil release
- Canton Sandbox + DevNet çift mod desteği
- Bridge katmanı: Ledger API v2 → JSON API uyum katmanı
- Dinamik package ID çözümü (`/api/package-id`)
- Sandbox admin token üretimi
- Docker Compose ile tek komut sandbox kurulumu
- DAR release: `canton-ticket-dar-0.1.0-lf22`
---
 
## 🙏 Acknowledgements
 
- [Digital Asset / Daml](https://daml.com) — Akıllı sözleşme altyapısı
- [Canton Network](https://canton.io) — Dağıtık defter protokolü
- [Google AI Studio](https://aistudio.google.com) — Repository template & Gemini entegrasyonu (`@google/genai`)
- [Vite](https://vitejs.dev) — Hızlı geliştirme sunucusu
- [Tailwind CSS](https://tailwindcss.com) — Stil çerçevesi
- [Motion](https://motion.dev) — Animasyon kütüphanesi
- [Lucide React](https://lucide.dev) — İkon seti
- [Ethers.js](https://docs.ethers.org) — Ethereum bağlantısı
