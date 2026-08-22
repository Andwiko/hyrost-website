# Google Drive Service Account

1. Salin `google-drive.example.json` → `google-drive-service-account.json`
2. Isi dengan JSON key dari Google Cloud Console
3. Set di `.env`:
   ```
   GOOGLE_DRIVE_CREDENTIALS=credentials/google-drive-service-account.json
   ```

Panduan lengkap: `docs/GOOGLE_DRIVE_SETUP.md`
