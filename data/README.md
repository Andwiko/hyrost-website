# Hyrost Local Data Directory

Folder ini dibuat otomatis saat server start. **Jangan di-commit ke git.**

| Subfolder | Isi |
|-----------|-----|
| `store/` | Fallback database JSON (jika MySQL offline) |
| `uploads/` | File gambar upload user |
| `backups/` | Snapshot MySQL terenkripsi (AES-256-GCM) |
| `cache/` | File sementara |

Lihat `docs/DATA_STORAGE.md` untuk detail keamanan dan restore.
