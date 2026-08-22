# HyrostBridge Plugin Integration

Plugin Spigot/Paper (`HyrostBridge.jar`) menghubungkan server Minecraft dengan Web App Hyrost — khususnya **Inventaris**, **Marketplace**, dan **Toko Pangkat**.

---

## Alur Sistem

```
[Web Inventaris/Marketplace] → user klik "Claim MC"
        ↓
[API /api/inventory/:id/claim-mc] → antre ke pending_deliveries
        ↓
[Plugin /claim atau Auto-Join] → GET /api/minecraft/pending-deliveries
        ↓
[Jalankan commandList di server] → POST /api/minecraft/confirm-delivery
        ↓
[Web] status inventaris → delivered
```

---

## Konfigurasi Plugin (`config.yml`)

```yaml
web-url: "http://localhost:3044"
api-key: "<MINECRAFT_BRIDGE_KEY dari .env>"
plugin-id: "hyrost_bridge"
poll-interval-seconds: 60
auto-notify-on-join: true
```

---

## Katalog Item Plugin

Admin mengelola katalog di **Admin Panel → Plugin Catalog** atau via API:

| Endpoint | Akses |
|---|---|
| `GET /api/plugin/info` | Public |
| `GET /api/plugin/catalog` | Public |
| `GET /api/admin/plugin-catalog` | Admin |
| `POST /api/admin/plugin-catalog` | Admin |

Setiap item katalog memiliki:

| Field | Contoh |
|---|---|
| `item_code` | `diamond_sword` |
| `minecraft_material` | `DIAMOND_SWORD` |
| `delivery_type` | `item`, `key`, `rank`, `cosmetic` |
| `plugin_commands` | `give {player} DIAMOND_SWORD {quantity}` |
| `plugin_id` | `hyrost_bridge` |

Placeholder perintah: `{player}`, `{material}`, `{quantity}`, `{item_code}`

---

## API Plugin → Web

Semua request wajib header: `X-Bridge-Api-Key: <MINECRAFT_BRIDGE_KEY>`

### 1. Verifikasi Link Akun
`POST /api/minecraft/verify-link`

### 2. Ambil Antrean Delivery
`GET /api/minecraft/pending-deliveries?uuid=<mc_uuid>`

Response:
```json
{
  "success": true,
  "pluginId": "hyrost_bridge",
  "count": 1,
  "deliveries": [{
    "id": 14,
    "inventory_id": 8,
    "item_type": "weapon",
    "item_name": "Diamond Sword",
    "item_code": "diamond_sword",
    "quantity": 1,
    "plugin_id": "hyrost_bridge",
    "commands": "give {player} DIAMOND_SWORD 1",
    "commandList": ["give {player} DIAMOND_SWORD 1"],
    "mc_username": "Steve"
  }]
}
```

Plugin mengganti `{player}` dengan username player sebelum menjalankan perintah.

### 3. Konfirmasi Delivery
`POST /api/minecraft/confirm-delivery`
```json
{ "deliveryId": 14, "status": "delivered" }
```

---

## API Web → Plugin (User)

| Endpoint | Fungsi |
|---|---|
| `POST /api/inventory/:id/claim-mc` | Antre item inventaris ke plugin |
| `POST /api/minecraft/claim-web-item` | Alias legacy (itemId = inventory id) |
| `POST /api/marketplace/listings/:id/buy` | Beli → masuk inventaris → claim manual |

---

## Status Klaim Inventaris

| Status | Arti |
|---|---|
| `none` | Belum diklaim ke MC |
| `queued` | Dalam antrean pending_deliveries |
| `delivered` | Plugin sudah konfirmasi |

---

## Marketplace + Plugin

Saat user menjual item di marketplace, pilih **Item Plugin (HyrostBridge)** dari katalog. Saat dibeli:

1. Item masuk `user_inventory` dengan metadata plugin
2. Buyer klik **Claim MC** di inventaris
3. Plugin mengeksekusi perintah sesuai katalog

---

## Env Variables

```env
MINECRAFT_BRIDGE_KEY=your_secret_key
MINECRAFT_PLUGIN_ID=hyrost_bridge
```
