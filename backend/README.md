# Hyrost Backend (Express API)

## Fitur Utama
- Autentikasi (JWT, Google/email)
- Role: admin & user
- Membership (akses premium)
- Forum (thread, reply, kategori)
- Chat (pribadi & grup, real-time)
- Dashboard admin

## Struktur Folder
```
/models      # Sequelize/Prisma models
/routes      # API routes (auth, forum, chat, membership, admin)
/controllers # Logic handler
/middleware  # Auth, role, error handler
/utils       # Helper functions
```

## Setup
1. `npm install`
2. Copy `.env.example` ke `.env` dan isi konfigurasi
3. Jalankan `npm run dev` untuk development

## Contoh .env
```
PORT=5000
DATABASE_URL=postgres://user:pass@localhost:5432/hyrost
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
```

## Saran
- Gunakan Sequelize/Prisma untuk ORM
- Gunakan bcrypt untuk hash password
- Gunakan socket.io untuk chat
- Pisahkan middleware untuk admin & user
- Dokumentasikan endpoint API
