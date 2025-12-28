# 🚀 Deploy Backend ke Railway - Panduan Cepat

## 1️⃣ Sign Up Railway (2 menit)

- Buka: https://railway.app/login
- Klik **"Login with GitHub"**
- Authorize Railway untuk akses repository

## 2️⃣ Create New Project (1 menit)

- Di dashboard Railway, klik **"New Project"**
- Pilih **"Deploy from GitHub repo"**
- Pilih: **`Andwiko/hyrost-website`**

## 3️⃣ Configure Backend (Auto-detect)

Railway akan otomatis detect:

- ✅ Language: Node.js
- ✅ Start Command: `npm start`

**Penting - Set Root Directory:**

- Klik **Settings** → **Root Directory**
- Isi: `backend`
- Save

## 4️⃣ Environment Variables

Klik **Variables** tab, tambahkan:

```
PORT=3000
NODE_ENV=production
JWT_SECRET=ganti-dengan-secret-key-anda
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hyrost
```

## 5️⃣ Deploy!

- Railway auto-deploy setelah config selesai
- Tunggu 2-3 menit
- Lihat di **Deployments** tab

## 6️⃣ Get Your URL

- Klik **Settings**
- Lihat **Domain** section
- URL: `https://your-app.up.railway.app`

---

## MongoDB Atlas Setup (GRATIS)

1. Buka: https://www.mongodb.com/cloud/atlas/register
2. Create FREE M0 cluster
3. Region: Singapore
4. Create database user
5. Whitelist IP: 0.0.0.0/0
6. Get connection string
7. Paste di Railway Variables

---

**Biaya:**

- Bulan 1: **GRATIS** ($5 credit)
- Bulan 2+: **$5/bulan** (~Rp 80k)
