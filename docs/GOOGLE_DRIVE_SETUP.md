# Backup Hyrost ke Google Drive

Panduan setup upload otomatis backup terenkripsi (`.hybk`) ke Google Drive.

## Prasyarat

- Akun Google
- Project Hyrost sudah jalan dengan backup lokal aktif (`LOCAL_BACKUP_ENABLED=true`)

## Langkah 1 — Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru (atau pilih yang ada)
3. **APIs & Services → Library** → cari **Google Drive API** → **Enable**

## Langkah 2 — Service Account

1. **APIs & Services → Credentials**
2. **Create Credentials → Service account**
3. Nama: `hyrost-backup` → Create
4. Role: tidak wajib (Skip atau Viewer)
5. Klik service account → tab **Keys**
6. **Add Key → Create new key → JSON** → download file

## Langkah 3 — Simpan kredensial di server

```bash
# Salin JSON ke folder credentials (jangan commit ke git!)
cp ~/Downloads/your-project-xxxxx.json credentials/google-drive-service-account.json
```

Catat email service account dari JSON, contoh:
```
hyrost-backup@your-project.iam.gserviceaccount.com
```

## Langkah 4 — Folder Google Drive

1. Buka [Google Drive](https://drive.google.com/)
2. Buat folder: `Hyrost-Backups`
3. Klik kanan folder → **Share / Bagikan**
4. Tambahkan **email service account** (langkah 3) sebagai **Editor**
5. Copy **Folder ID** dari URL:
   ```
   https://drive.google.com/drive/folders/1ABCxyz_FOLDER_ID_HERE
   ```

## Langkah 5 — Konfigurasi `.env`

```env
GOOGLE_DRIVE_ENABLED=true
GOOGLE_DRIVE_FOLDER_ID=1ABCxyz_FOLDER_ID_HERE
GOOGLE_DRIVE_CREDENTIALS=credentials/google-drive-service-account.json
GOOGLE_DRIVE_KEEP=14
```

## Langkah 6 — Restart server

```bash
npm start
# atau
pm2 restart hyrost-website
```

Log sukses:
```
💾 Local auto-backup enabled (every 24h → data/backups/)
☁️  Google Drive backup ready → folder 1ABCxyz...
   Service account: hyrost-backup@your-project.iam.gserviceaccount.com
💾 Local backup saved: .../data/backups/backup-....hybk
☁️  Google Drive backup uploaded: hyrost-backup-....hybk (fileId)
```

## Restore dari Google Drive

1. Download file `.hybk` dari folder `Hyrost-Backups` di Drive
2. File sudah terenkripsi AES-256-GCM (key dari `JWT_SECRET` / `LOCAL_BACKUP_KEY`)
3. Decrypt & import manual ke MySQL, atau gunakan Admin Panel → Backup → Restore (format JSON plain)

> Backup di Drive tetap terenkripsi — aman meski akun Drive kompromi tanpa `JWT_SECRET`.

## Troubleshooting

| Error | Solusi |
|-------|--------|
| `credentials not found` | Path `GOOGLE_DRIVE_CREDENTIALS` benar, file ada |
| `403 / insufficient permissions` | Folder Drive di-share ke email service account |
| `404 file not found` (folder) | `GOOGLE_DRIVE_FOLDER_ID` salah |
| Upload tidak jalan | `GOOGLE_DRIVE_ENABLED=true` dan restart server |

## Keamanan

- **Jangan commit** `google-drive-service-account.json` ke git
- Scope API minimal: `drive.file` (hanya file yang dibuat app)
- Backup terenkripsi sebelum upload
- Rotasi key service account berkala di Google Cloud Console
