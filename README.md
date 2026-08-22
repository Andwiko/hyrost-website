# Hyrost Realm — Website & Community Hub

Website resmi komunitas server Minecraft **Hyrost Realm**: forum, marketplace, dashboard, toko pangkat, wiki, dan integrasi in-game.

## Fitur

- Autentikasi (JWT + Google OAuth)
- Forum, chat, support tickets
- Marketplace & toko kosmetik/pangkat
- Dashboard user & panel admin
- Leaderboard, daily rewards, quests, vouchers
- Integrasi Minecraft (link akun, claim item, status server realtime)
- Live Hub — aktivitas & chat web realtime
- PWA (manifest + service worker)

## Technology Stack

| Layer | Teknologi |
|---|---|
| Frontend | HTML, CSS, JavaScript (static) |
| Backend | Node.js, Express 5 |
| Database | MySQL (fallback in-memory untuk dev offline) |
| Auth | JWT, Google OAuth |
| Minecraft | HyrostBridge plugin (REST + API key) |

## Persiapan

```bash
npm install
cp .env.example .env
# Edit .env — lihat tabel di bawah
```

File `.env` harus berada di **root project** (sejajar dengan `package.json`), bukan di `backend/`.

## Konfigurasi Environment

### Wajib (production)

| Variabel | Keterangan |
|---|---|
| `PORT` | Port server HTTP (default `3044`) |
| `JWT_SECRET` | Secret JWT — string acak panjang; **wajib** jika `NODE_ENV=production` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` | Koneksi MySQL utama |
| `MINECRAFT_BRIDGE_KEY` | API key plugin Minecraft — sama dengan `api-key` di `config.yml` plugin |
| `ALLOWED_ORIGINS` | Domain CORS (pisahkan koma), contoh: `https://hyrost.net,http://localhost:3044` |

### Opsional

| Variabel | Keterangan |
|---|---|
| `NODE_ENV` | `development` atau `production` (PM2 set via `ecosystem.config.js`) |
| `GOOGLE_CLIENT_ID` | Login Google OAuth |
| `ADMIN_SEED_USERNAME` | Username admin pertama (hanya jika belum ada admin) |
| `ADMIN_SEED_EMAIL` | Email admin seed |
| `ADMIN_SEED_PASSWORD` | Password admin seed |
| `MINECRAFT_PLUGIN_ID` | ID plugin (default `hyrost_bridge`) |
| `MONGO_URI` | MongoDB legacy — sebagian besar fitur sudah MySQL |
| `LOCAL_DATA_DIR` | Folder penyimpanan lokal aman (default `data`) |
| `LOCAL_STORE_SYNC` | Sync fallback DB ke file JSON (`true`/`false`) |
| `LOCAL_BACKUP_*` | Auto-backup MySQL terenkripsi ke `data/backups/` |
| `GOOGLE_DRIVE_*` | Upload backup otomatis ke Google Drive — [`docs/GOOGLE_DRIVE_SETUP.md`](docs/GOOGLE_DRIVE_SETUP.md) |

Detail lengkap: [`docs/DATA_STORAGE.md`](docs/DATA_STORAGE.md)

### Tidak perlu di `.env`

| Fitur | Cara konfigurasi |
|---|---|
| IP & port server Minecraft | **Admin Panel → Settings → Konfigurasi IP Server** |
| Auto-ping status (mcsrvstat) | Admin Panel → toggle *Auto-Ping Status Server* |
| Live Hub / chat realtime web | Otomatis — tidak butuh env |
| Pengumuman & maintenance | Admin Panel → Settings |

### Contoh `.env` minimal (development lokal)

```env
PORT=3044
NODE_ENV=development
JWT_SECRET=dev_secret_ganti_di_production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=hyrost
ALLOWED_ORIGINS=http://localhost:3044,http://127.0.0.1:3044
MINECRAFT_BRIDGE_KEY=dev_bridge_key_ganti_di_production
MINECRAFT_PLUGIN_ID=hyrost_bridge
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

### Integrasi Minecraft (plugin)

1. Set `MINECRAFT_BRIDGE_KEY` di `.env` website
2. Set `api-key` yang **sama** di `config.yml` plugin HyrostBridge
3. Restart website dan reload plugin
4. Plugin kirim heartbeat ke `POST /api/minecraft/status` (header `X-Bridge-Api-Key`)

Detail endpoint: [`docs/MINECRAFT_PLUGIN_SPEC.md`](docs/MINECRAFT_PLUGIN_SPEC.md)

## Menjalankan

```bash
# Production
npm start

# Development (auto-reload)
npm run dev

# PM2
pm2 start ecosystem.config.js --env production
```

Buka: **http://127.0.0.1:3044**

## Admin

Buat atau reset akun admin (butuh `ADMIN_SEED_*` di `.env`):

```bash
node create_admin_account.js
```

Panel admin: `/modules/admin.html`

## Deployment

- Backend melayani frontend statis dari root project
- Gunakan PM2 (`ecosystem.config.js`) atau process manager lain di VPS
- Pastikan MySQL dapat dijangkau dari VPS
- Set `NODE_ENV=production`, `JWT_SECRET`, `MINECRAFT_BRIDGE_KEY`, dan `ALLOWED_ORIGINS` sebelum go-live
- **Jangan commit file `.env`** ke git

## License

© 2025 Hyrost. All rights reserved.
