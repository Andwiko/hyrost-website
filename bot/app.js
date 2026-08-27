/**
 * =============================================================================
 * MEI LABS DISCORD BOT — OFFICIAL PORTFOLIO JAVASCRIPT
 * Synchronized with Mei Labs Bot Core Engine (v1.2.0 - 197+ Commands & 23 Features)
 * Powered by Google Gemini AI, Lavalink HQ Audio, RPG Systems, and Master Setup
 * =============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initMobileNav();
  initAutoVersionSync();
  initVoiceQuotes();
  initAIChatSimulator();
  initFeatureTabs();
  initMusicPlayer();
  initRankCardGenerator();
  initCommandExplorer();
  initEmbedBuilderWithPresets();
  initSetupDashboardSimulator();
  initFeatureSwitchboardSimulator();
  initInviteModal();
  initLiveStatsTicker();
});

/* -----------------------------------------------------------------------------
 * 1. NAVBAR & SCROLL BEHAVIOR
 * -------------------------------------------------------------------------- */
function initNavbarScroll() {
  const navbar = document.querySelector('.bot-navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
}

function initMobileNav() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navMenu = document.getElementById('botNavMenu');
  if (!toggleBtn || !navMenu) return;

  toggleBtn.addEventListener('click', () => {
    navMenu.classList.toggle('open');
    const isOpen = navMenu.classList.contains('open');
    toggleBtn.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
  });

  navMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
    });
  });
}

/* -----------------------------------------------------------------------------
 * 1. NAVBAR, VERSION SYNC & CHANGELOG MODAL
 * -------------------------------------------------------------------------- */
const CURRENT_BOT_VERSION = 'v2.54.24.1.1';

const BOT_CHANGELOGS = [
  {
    version: '2.54.24.1.1',
    title: '🏛️ 5 NEXT-GEN REVOLUTIONARY CORE PILLARS: MICRO-KERNEL, WORKER POOL & VOICE AI',
    date: '27 Agustus 2026',
    badge: '💎 Versi Aktif Saat Ini',
    color: '#9B59B6',
    highlights: [
      '🧩 <strong>Micro-Kernel Hot-Swap Plugin Engine (<code>!kernel</code>):</strong> Isolasi modular sandbox dengan kemampuan reload modul secara live tanpa restart bot (0ms downtime).',
      '🧠 <strong>Autonomous Self-Healing AI Diagnostic Daemon:</strong> Penganalisis error otonom di level Node.js runtime yang mendeteksi anomali dan memulihkan koneksi secara mandiri.',
      '⚡ <strong>True 0ms Event Loop Lag — Async Worker Thread Pool:</strong> Komputasi berat dialihkan ke worker thread multi-threading terpisah agar respons interaksi Discord selalu instan.',
      '🎙️ <strong>Real-Time Conversational Voice AI Companion (<code>!voiceai</code>):</strong> Sintesis Text-to-Speech cerdas yang memungkinkan AI Mei berbicara langsung di Voice Channel.',
      '🌐 <strong>Zero-Downtime State Persistence Mesh:</strong> Snapshot memori aktif yang memulihkan player lagu dan sesi suara 100% utuh saat restart.'
    ]
  },
  {
    version: '2.54.23.1.1',
    title: '🚀 ENTERPRISE CORE UPGRADE: HONEYPOT, 24/7 RADIO, AI MOD & MC RCON',
    date: '27 Agustus 2026',
    badge: '🚀 Enterprise Upgrade',
    color: '#00E5FF',
    highlights: [
      '🛡️ <strong>Enterprise Security & Honeypot Trap (<code>!honeypot</code>, <code>!modstats</code>):</strong> Channel jebakan otomatis untuk auto-ban bot raid & spammer serta audit performa moderator.',
      '📻 <strong>24/7 Live Internet Radio (<code>!radio</code>):</strong> Menu interaktif 1-klik untuk siaran langsung radio non-stop (Lofi Girl, Anime OST, Nightcore, Synthwave, Cafe Jazz, Acoustic).',
      '🤖 <strong>AI Context Moderation (<code>!aimod</code>):</strong> Deteksi cerdas link phising, scam, dan kalimat toxic menggunakan Natural Language Processing.',
      '🎛️ <strong>Web Control Panel & Cloud Backup:</strong> Manajemen server langsung dari web browser serta scheduler backup snapshot database otomatis setiap 24 jam.',
      '🏰 <strong>Minecraft RCON & Seasonal Leaderboard (<code>!mcwhitelist</code>, <code>!season</code>):</strong> Sinkronisasi whitelist server Minecraft via TCP RCON serta sistem klasemen musiman.'
    ]
  },
  {
    version: '2.54.22.1.1',
    title: '📊 ACTIVITY ANALYTICS BUFFER FLUSH & CHANNEL MAP RESILIENCY',
    date: '25 Agustus 2026',
    badge: '📊 Analytics Map Resiliency',
    color: '#EB459E',
    highlights: [
      '📊 <strong>Penyelarasan Tipe Data Map & Objek:</strong> Memperbaiki deserialisasi <code>stats.channelActivity</code> agar kompatibel penuh dengan JavaScript Map, Mongoose Map, maupun plain JSON Object.',
      '⚡ <strong>Penyimpanan Atomik & Non-Blocking:</strong> Mengganti metode <code>.save()</code> dengan <code>Guild.updateOne()</code> atomik yang aman terhadap cache in-memory.',
      '🛡️ <strong>Connection State Shield:</strong> Proteksi status koneksi MongoDB sebelum operasi database berkala dijalankan.'
    ]
  },
  {
    version: '2.54.21.1.1',
    title: '📰 INTERACTIVE MOJANG NEWS CENTER & 360° FULL SKIN ORBIT ROTATION',
    date: '25 Agustus 2026',
    badge: '📰 News & 360 Studio',
    color: '#2ECC71',
    highlights: [
      '📰 <strong>Interaktif Penuh Warta Minecraft (<code>!mcnews</code>):</strong> Integrasi langsung feed resmi Mojang Studios dengan filter kategori (Java, Bedrock, Snapshots, Spinoffs), dropdown artikel, dan tombol navigasi.',
      '🧭 <strong>Rotasi 360° Studio Karakter (<code>!mcskin</code>):</strong> Kontrol sudut putar 360 derajat (0°-315°) dengan tombol putar presisi <code>↺ -45°</code> & <code>↻ +45°</code> dan integrasi 3D Web Studio.',
      '⚡ <strong>Non-Blocking Resiliency:</strong> Standarisasi cache in-memory pada permission lisensi dan pencegahan timeout interaksi Discord.'
    ]
  },
  {
    version: '2.54.20.1.1',
    title: '⚡ ZERO-LATENCY INTERACTION DISPATCH & MENU RESILIENCE',
    date: '25 Agustus 2026',
    badge: '⚡ Zero-Latency Dispatch',
    color: '#00E5FF',
    highlights: [
      '⚡ <strong>Non-Blocking In-Memory UI Resolution:</strong> Cache in-memory instan untuk dropdown menu bantuan <code>!help</code> menghilangkan error timeout interaksi.',
      '🛡️ <strong>Connection-Aware Timeout Shield:</strong> Proteksi <code>Promise.race</code> (800ms) menghasilkan respon transisi kategori menu di bawah 50ms.',
      '🔄 <strong>Fail-Safe Interaction Resiliency:</strong> Error handling menyeluruh untuk tombol navigasi Beranda, Pencarian, dan pemilihan perintah.'
    ]
  },
  {
    version: '2.54.19.1.1',
    title: '✨ PURE COMMUNITY TIER ARCHITECTURE (FREE, SUPPORTER, PARTNER, FOUNDER)',
    date: '23 Agustus 2026',
    badge: '✨ Pure Community Tier',
    color: '#FF69B4',
    highlights: [
      '🧹 <strong>Penghapusan Total Tier Lama:</strong> Menghapus tier legacy (<code>vip</code>, <code>pro</code>, <code>enterprise</code>) dari skema database Mongoose dan lisensi <code>!genkey</code>.',
      '💎 <strong>Arsitektur 4 Tier Murni:</strong> Standarisasi resmi: <code>Free</code> (Tier 0), <code>Mei\'s Supporter</code> (Tier 1), <code>Lab Partner</code> (Tier 2), dan <code>Mei Labs Founder</code> (Tier 3).',
      '🛡️ <strong>Strict Schema Enforcement:</strong> Validasi ketat yang menjamin konsistensi di seluruh ekosistem bot dan dashboard.'
    ]
  },
  {
    version: '2.54.18.1.1',
    title: '🔑 SUPPORTER & FOUNDER LICENSE SCHEMA ALIGNMENT',
    date: '23 Agustus 2026',
    badge: '🔑 Schema Alignment',
    color: '#FF69B4',
    highlights: [
      '🔑 <strong>Mongoose Enum Schema Alignment:</strong> Penambahan tier supporter, partner, dan founder ke dalam skema database.',
      '🛡️ <strong>Multi-Tier Backward Compatibility:</strong> Dukungan transisi nama tier baru dan alias legasi secara mulus.',
      '⚡ <strong>Validated License Minting:</strong> Pembuatan dan aktivasi lisensi 100% instan dan bebas kendala skema.'
    ]
  },
  {
    version: '2.54.17.1.1',
    title: '🛡️ BUTTON INTERACTION GUARD & DISCORD 10062 API RESILIENCE',
    date: '23 Agustus 2026',
    badge: '🛡️ Interaction Guard',
    color: '#00E5FF',
    highlights: [
      '🛡️ <strong>Global Interaction Options Guard:</strong> Fallback options proxy universal untuk seluruh tombol interaktif (inventory, balance, rank, weekly).',
      '⚡ <strong>Discord API 10062/40060 Resilience Shield:</strong> Penanganan token interaksi expired/stale pada menu dropdown help.',
      '🔄 <strong>Smart FollowUp vs Reply Routing:</strong> Menghindari tabrakan state respon Discord pada aksi tombol cepat berulang.'
    ]
  },
  {
    version: '2.54.16.1.1',
    title: '🎧 MULTI-NODE LAVALINK REDUNDANCY & FAILOVER POOL',
    date: '23 Agustus 2026',
    badge: '🎧 Lavalink Cluster',
    color: '#1DB954',
    highlights: [
      '🛡️ <strong>Multi-Node Failover Cluster:</strong> Konfigurasi 3 node Lavalink v4 aktif dengan auto-failover agar musik tidak terputus.',
      '⚡ <strong>Auto-Reconnect & Retry Shield (15x Retries):** Peningkatan percobaan ulang koneksi hingga 15 kali untuk stabilitas 24/7.',
      '🌐 <strong>Dual-Layer Voice Guardian:</strong> Menjaga integritas room suara saat node lavalink berganti tanpa merusak status Voice 24/7.'
    ]
  },
  {
    version: '2.54.15.1.1',
    title: '⚡ DEEP PERFORMANCE OPTIMIZATION: LRU CACHE & COMPOUND INDEXES',
    date: '23 Agustus 2026',
    badge: '⚡ Performance Suite',
    color: '#2ECC71',
    highlights: [
      '🚀 <strong>LRU Memory Cache Lirik (<code>utils/lyricsFinder.js</code>):</strong> Pencarian lirik lagu disimpan di in-memory cache dengan 0ms latency.',
      '🗄️ <strong>MongoDB Compound Indexing:</strong> Indeks multi-kunci <code>(guildId + balance)</code> dan <code>(guildId + bank)</code> mempercepat kueri leaderboard hingga 5x.',
      '🛡️ <strong>Zero Memory Leak Safety:</strong> Optimasi pembersihan event listener, audio buffer recycle, dan garbage collection.'
    ]
  },
  {
    version: '2.54.14.1.1',
    title: '🎨 MULTI-TIER PIXELATE ENGINE WITH REAL-TIME QUALITY SWITCHING',
    date: '23 Agustus 2026',
    badge: '🎨 Pixel Art Engine',
    color: '#E67E22',
    highlights: [
      '✨ <strong>5 Opsi Kualitas Pixel:</strong> Pilihan kerapatan dari <code>4px</code> (Ultra HD), <code>8px</code> (16-Bit), <code>16px</code> (Arcade 8-Bit), <code>32px</code>, hingga <code>64px</code>.',
      '🔘 <strong>Tombol Live Switcher:</strong> Tombol interaktif langsung di Discord untuk mengubah kualitas pixel secara instan.',
      '⚡ <strong>Slash & Prefix Support:</strong> Mendukung <code>/pixelate quality:...</code> serta input langsung <code>!pixelate @user 16</code>.'
    ]
  },
  {
    version: '2.54.13.1.1',
    title: '💳 CATEGORIZED FINANCIAL BOARD, REALM GEMS & IDENTITY CARD',
    date: '23 Agustus 2026',
    badge: '💳 Financial Suite',
    color: '#00E5FF',
    highlights: [
      '💼 <strong>Papan Finansial Terkategori (<code>!balance</code>):</strong> Pemisahan jelas antara Uang Tunai, Saldo Bank, Realm Gems 💎, dan Net Worth.',
      '👤 <strong>Kartu Identitas Komprehensif (<code>!profile</code>):</strong> Rangkuman level, XP progress bar, finansial, statistik RPG, dan badge donatur.',
      '🌐 <strong>Sinkronisasi Web Hyrost (<code>/api/economy/sync</code>):</strong> Web Hyrost membaca dan menampilkan data Dompet, Bank, dan Gems secara akurat.'
    ]
  },
  {
    version: '2.54.12.1.1',
    title: '⚡ FULL INTERACTIVITY SUITE: LIVE POLL, SLOTS, COINFLIP, 8BALL & JOKES',
    date: '23 Agustus 2026',
    badge: '⚡ Interactive Suite',
    color: '#2ECC71',
    highlights: [
      '📊 <strong>Live Interactive Polling (<code>!poll</code>):</strong> Polling suara langsung dengan 3 tombol dan progress bar persentase live.',
      '🎰 <strong>Mesin Slot Cepat (<code>!slots</code>):</strong> Tombol aksi cepat <code>[🎰 Putar Lagi]</code> dan <code>[⚡ 2x Taruhan]</code>.',
      '🪙 <strong>Lempar Koin Interaktif (<code>!coinflip</code>):</strong> Tombol pasang cepat <code>[🦅 Kepala]</code> dan <code>[🪙 Ekor]</code>.',
      '🎱 <strong>Magic 8-Ball & Humor (<code>!8ball</code>, <code>!joke</code>):</strong> Tombol kocok ulang dan lelucon baru.'
    ]
  },
  {
    version: '2.54.11.1.1',
    title: '🎮 INTERACTIVE MINI-GAMES: 3X3 TICTACTOE, TRIVIA & BUTTON RPS',
    date: '23 Agustus 2026',
    badge: '🎮 Mini-Games Suite',
    color: '#3498DB',
    highlights: [
      '❌ <strong>Tic-Tac-Toe 3x3 Interaktif (<code>!tictactoe</code>):</strong> Papan 3x3 tombol interaktif bertanding melawan AI Bot Mei atau teman.',
      '🧠 <strong>Kuis Trivia Interaktif (<code>!trivia</code>):</strong> Kuis pilihan ganda 4 tombol dengan timer 20 detik dan reward koin ekonomi.',
      '🪨 <strong>Batu Gunting Kertas Modern (<code>!rps</code>):</strong> Tombol suit interaktif dengan status pemenang dinamis.'
    ]
  },
  {
    version: '2.54.10.1.1',
    title: '🌟 SUPPORTER AUTOMATION, CUSTOM COMMAND ENGINE & FOUNDER GREETING',
    date: '23 Agustus 2026',
    badge: '🌟 Supporter Automation',
    color: '#FF69B4',
    highlights: [
      '👑 <strong>Auto-Role & Auto-Channel on Redeem:</strong> Otomatisasi pemberian Role Supporter dan akses channel private eksklusif.',
      '💬 <strong>Personalized Bot Response (<code>!greeting</code>):</strong> Gelar sapaan kustom untuk donatur Tier 3 Founder di seluruh respon bot.',
      '⚡ <strong>Custom Command Engine (<code>!customcmd</code>):</strong> Pembuatan perintah pesan/link kustom server bagi Tier 2 & Tier 3.',
      '📢 <strong>Server Hall of Fame & Shoutout (<code>!shoutout</code>):</strong> Papan apresiasi estetik untuk seluruh donatur dan founder.'
    ]
  },
  {
    version: '2.54.9.1.1',
    title: '💖 OFFICIAL SUPPORTER, LAB PARTNER & FOUNDER TIERS MATRIX',
    date: '23 Agustus 2026',
    badge: '💎 Official Tiers Matrix',
    color: '#FFD700',
    highlights: [
      '💖 <strong>Tier 1: Mei\'s Supporter:</strong> Role warna unik, akses supporter-chat, bonus emote, Voice 24/7 & HD Audio.',
      '🧪 <strong>Tier 2: Lab Partner:</strong> Request custom bot command, cooldown cepat, Anti-Nuke Fortress & Studio HD 256 kbps.',
      '👑 <strong>Tier 3: Mei Labs Founder:</strong> Role prestisius, akses beta fitur, custom voice room, personalized bot response, monthly shoutout.'
    ]
  },
  {
    version: '2.54.8.1.1',
    title: '🚀 CODEBASE MODERNIZATION & INTERACTIVE QUICK-ACTIONS',
    date: '23 Agustus 2026',
    badge: '🚀 Modernization Update',
    color: '#00E5FF',
    highlights: [
      '⚡ <strong>100% Deprecation Clean (37 Files):</strong> Seluruh parameter ephemeral dimutakhirkan ke flags: 64 standar Discord.js modern.',
      '💳 <strong>Interactive Economy Cards:</strong> Perintah balance & rank dilengkapi tombol cepat Klaim Daily, Buka Tas, Ladang Farm, Top Kaya.',
      '🛡️ <strong>Quick-Action Moderasi (<code>!warn</code>, <code>!ban</code>, <code>!timeout</code>):</strong> Log sanksi menyertakan tombol Unban Cepat, Cabut Timeout, Hapus Warn, Edit Alasan.',
      '🌐 <strong>Real-Time Discord ↔ Hyrost Web Sync (<code>/api/economy/sync</code>):</strong> Sinkronisasi inventaris & koin bot ke portal web.'
    ]
  },
  {
    version: '2.54.7.1.1',
    title: '📜 UNIVERSAL MUSIC LYRICS & 16-GENRE RADIO EXPLORER',
    date: '23 Agustus 2026',
    badge: '📜 Music Lyrics & Radio',
    color: '#FF69B4',
    highlights: [
      '📜 <strong>Pencari Lirik Universal (<code>!lyrics</code>):</strong> Lirik lagu real-time dari database global LRCLIB API.',
      '🔘 <strong>Tombol Lirik di Music Dashboard:</strong> Akses lirik 1-klik langsung dari panel controller lagu.',
      '📻 <strong>16-Genre Music Radio (<code>!genre</code>):</strong> Dropdown selector memutar playlist acak (Lofi, Pop Indo, Rock, Anime, Phonk, Jazz, dll).'
    ]
  },
  {
    version: '2.54.6.1.1',
    title: '🎮 3D BLOCKBENCH SKIN & DYNAMIC POSING STUDIO',
    date: '23 Agustus 2026',
    badge: '🎮 3D Skin Studio',
    color: '#9B59B6',
    highlights: [
      '🎮 <strong>3D Blockbench WebGL Skin Studio (<code>/skin</code>):</strong> Viewport 3D 60FPS di browser dengan rotasi 360°, zoom, dan pan.',
      '⚔️ <strong>Preset Pose Aksi:</strong> Samurai Katana, Knight Shield, Archer, Ninja, dan Elytra Gliding.',
      '🎚️ <strong>Bone Rigging:</strong> Slider tekukan tangan kanan/kiri, kaki, dan kepala presisi.',
      '📸 <strong>Snapshot 4K PNG:</strong> Ekspor render karakter 3D beresolusi tinggi dengan background transparan.'
    ]
  },
  {
    version: '2.54.5.1.1',
    title: '🌐 LIVE WEB STATUS DASHBOARD & HEALTH PORTAL',
    date: '21 Agustus 2026',
    badge: '🌐 Web Status Portal',
    color: '#00D2D3',
    highlights: [
      '🌐 <strong>Live Web Status Dashboard (<code>!dashboard</code>):</strong> Portal web memantau status uptime, ping, RAM, dan room musik aktif.',
      '📊 <strong>RESTful Health Check API (<code>/api/health</code>):</strong> Endpoint JSON publik untuk integrasi Uptime monitoring.',
      '🔄 <strong>Live Auto-Sync 5 Detik:</strong> Metrik real-time diperbarui otomatis di browser.'
    ]
  },
  {
    version: '2.54.0.0.0',
    title: '👑 THE VIP FORTRESS & PERFORMANCE EDITION',
    date: '21 Agustus 2026',
    badge: '💎 Lisensi VIP & Anti-Nuke',
    color: '#9B59B6',
    highlights: [
      '💎 <strong>Sistem Langganan VIP & Lisensi (<code>!premium</code>, <code>!genkey</code>):</strong> Aktivasi via kode lisensi resmi.',
      '🚨 <strong>Enterprise Anti-Nuke Fortress (<code>!antinuke</code>):</strong> Perlindungan mutlak dari bahaya rogue admin dan mass ban.',
      '🛡️ <strong>AI Deep Phishing Blocker:</strong> Pemindaian cerdas tautan scam airdrop dan fake nitro.'
    ]
  },
  {
    version: '2.53.0.0.0',
    title: '🛡️ ADVANCED MODERATION & AUTOMATION PACK',
    date: '21 Agustus 2026',
    badge: '🛡️ Moderasi & Otomasi',
    color: '#E74C3C',
    highlights: [
      '📜 <strong>Mod History Rap Sheet (<code>!history @user</code>):</strong> Profil disiplin lengkap riwayat sanksi dan catatan internal.',
      '🚨 <strong>Emergency Server Lockdown (<code>!lockdown</code>):</strong> Kunci seluruh channel publik dalam 1 detik saat darurat.',
      '👻 <strong>Anti-Ghost Ping Detector:</strong> Menangkap dan mengekspos pelaku ghost ping.'
    ]
  },
  {
    version: '2.52.0.0.0',
    title: '💖 DYNAMIC LIVE HUBS & VIRTUAL COMPANION',
    date: '20 Agustus 2026',
    badge: '🌸 Sahabat & Live Hubs',
    color: '#FF69B4',
    highlights: [
      '📖 <strong>Live Server Guide & FAQ Hub (<code>!guidehub</code>):</strong> Papan panduan in-place edit otomatis.',
      '📅 <strong>Live Event Schedule Hub (<code>!eventhub</code>):</strong> Kalender jadwal event dengan countdown dinamis.',
      '💖 <strong>Mei Super Virtual Companion:</strong> Asisten virtual empati tinggi yang proaktif menyemangati member.'
    ]
  },
  {
    version: '2.50.0.0.0',
    title: '⚖️ CORE RPG GAMEPLAY & ECONOMY REBALANCE',
    date: '18 Agustus 2026',
    badge: '⚖️ Gameplay Tuning',
    color: '#F1C40F',
    highlights: [
      '🎣 <strong>Fishing Pier Rebalance:</strong> Cooldown mancing, mekanik ikan meloloskan diri, dan sampah laut.',
      '🏹 <strong>Hunting Camp Rebalance:</strong> Cooldown berburu, sistem mangsa kabur, dan akurasi panah.',
      '🌾 <strong>Virtual Farm Overhaul:</strong> Durasi pertumbuhan bibit realistis dan sistem bonus penyiraman air.'
    ]
  },
  {
    version: '2.30.0.0.0',
    title: '🤖 AI ASSISTANT & SUPPORT TICKET MATRIX',
    date: '1 Agustus 2026',
    badge: '🤖 AI & Layanan Tiket',
    color: '#9B59B6',
    highlights: [
      '🤖 <strong>AI Gemini Assistant (<code>!ask</code>):</strong> Integrasi kecerdasan buatan Google Gemini dengan persona resmi Mei Labs.',
      '🎫 <strong>Sistem Tiket Bantuan (<code>!ticket</code>):</strong> Ruang bantuan private member berbasis form modal dan transkrip obrolan.'
    ]
  },
  {
    version: '2.20.0.0.0',
    title: '🎵 LAVALINK V4 AUDIO STUDIO & SOUND FILTERS',
    date: '20 Juli 2026',
    badge: '🎵 Studio Audio HD',
    color: '#1ABC9C',
    highlights: [
      '🎵 <strong>Lavalink v4 Multi-Node Audio:</strong> Pemutar musik lossless dengan failover otomatis.',
      '🎛️ <strong>Interactive Music Dashboard:</strong> Panel kontrol live di channel <code>#music</code>.',
      '🔊 <strong>Digital Sound Equalizer:</strong> Filter Bassboost, 8D Surround, Nightcore, dan Vaporwave.'
    ]
  },
  {
    version: '2.0.0.0.0',
    title: '🧠 GENERASI 2.0 MEI LABS GENESIS',
    date: '15 Juni 2026',
    badge: '🚀 Core Genesis V2',
    color: '#2ECC71',
    highlights: [
      '🧠 <strong>Pondasi Arsitektur V2:</strong> Migrasi penuh ke Discord.js v14 dan sistem modular Core + Plugin.',
      '🍃 <strong>Database Cloud MongoDB:</strong> Penyimpanan data profil dan inventaris warga secara permanen di cloud.',
      '🛡️ <strong>Sistem Anti-Crash & Auto-Recovery:</strong> Perekam sesi musik aktif dan pemulihan otomatis saat restart.'
    ]
  },
  {
    version: '1.0.0.0.0',
    title: '🌱 INTI AWAL CLASSIC MEI BOT (DAY ONE)',
    date: '1 Maret 2026',
    badge: '🌱 Generasi 1.0 Day One',
    color: '#7F8C8D',
    highlights: [
      '🌱 <strong>Kelahiran Bot Mei:</strong> Bot Discord monolitik awal berbasis Discord.js v13.',
      '⚙️ <strong>Perintah Utilitas Dasar:</strong> <code>!ping</code>, <code>!help</code>, <code>!clear</code>, <code>!userinfo</code>, <code>!avatar</code>, <code>!say</code>.',
      '📁 <strong>Penyimpanan Lokal:</strong> Konfigurasi berbasis file JSON lokal.'
    ]
  }
];

function initAutoVersionSync() {
  document.querySelectorAll('.bot-version-text').forEach(el => {
    el.textContent = CURRENT_BOT_VERSION;
  });
}

function openChangelogModal() {
  const modal = document.getElementById('changelogModalOverlay');
  const body = document.getElementById('changelogModalBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="margin-bottom:16px; display:flex; gap:10px; align-items:center;">
      <div style="position:relative; flex:1;">
        <i class="fas fa-search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-placeholder);"></i>
        <input type="text" id="changelogSearchInput" placeholder="Cari changelog (contoh: skin, kernel, ai, rcon, music)..." style="width:100%; background:var(--bg-input, #090d16); border:1px solid var(--border-subtle); border-radius:8px; padding:10px 12px 10px 36px; color:#fff; font-size:0.85rem;" oninput="filterChangelogs(this.value)">
      </div>
      <span style="font-size:0.8rem; color:var(--text-muted); font-weight:700; white-space:nowrap;" id="changelogCountBadge">${BOT_CHANGELOGS.length} Rilis</span>
    </div>
    <div id="changelogItemsContainer">
      ${renderChangelogHTML(BOT_CHANGELOGS)}
    </div>
  `;

  modal.classList.add('open');
}

function renderChangelogHTML(list) {
  if (!list || list.length === 0) {
    return `<div style="text-align:center; padding:30px 10px; color:var(--text-muted); font-size:0.9rem;">
      <i class="fas fa-search" style="font-size:2rem; margin-bottom:10px; opacity:0.5; display:block;"></i>
      Tidak ada catatan rilis yang cocok dengan kata kunci pencarian.
    </div>`;
  }

  return list.map(ch => `
    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-left:4px solid ${ch.color}; border-radius:10px; padding:16px; margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
        <span style="font-weight:900; color:#fff; font-size:0.95rem;">v${ch.version}</span>
        <div style="display:flex; gap:6px; align-items:center;">
          <span style="background:${ch.color}22; color:${ch.color}; font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:99px; border:1px solid ${ch.color}44;">${ch.badge}</span>
          <span style="font-size:0.75rem; color:var(--text-muted);">${ch.date}</span>
        </div>
      </div>
      <h5 style="color:${ch.color}; font-size:0.85rem; font-weight:800; margin:0 0 10px;">${ch.title}</h5>
      <ul style="margin:0; padding-left:18px; font-size:0.82rem; color:var(--text-secondary, #cbd5e1); line-height:1.6;">
        ${ch.highlights.map(h => `<li style="margin-bottom:6px;">${h}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

function filterChangelogs(query) {
  const container = document.getElementById('changelogItemsContainer');
  const countBadge = document.getElementById('changelogCountBadge');
  if (!container) return;

  const q = (query || '').toLowerCase().trim();
  if (!q) {
    container.innerHTML = renderChangelogHTML(BOT_CHANGELOGS);
    if (countBadge) countBadge.textContent = `${BOT_CHANGELOGS.length} Rilis`;
    return;
  }

  const filtered = BOT_CHANGELOGS.filter(ch => {
    const v = ch.version.toLowerCase();
    const t = ch.title.toLowerCase();
    const d = ch.date.toLowerCase();
    const h = ch.highlights.join(' ').toLowerCase();
    return v.includes(q) || t.includes(q) || d.includes(q) || h.includes(q);
  });

  container.innerHTML = renderChangelogHTML(filtered);
  if (countBadge) countBadge.textContent = `${filtered.length} Rilis Ditemukan`;
}

function closeChangelogModal() {
  const modal = document.getElementById('changelogModalOverlay');
  if (modal) modal.classList.remove('open');
}
window.openChangelogModal = openChangelogModal;
window.closeChangelogModal = closeChangelogModal;
window.filterChangelogs = filterChangelogs;

/* -----------------------------------------------------------------------------
 * 2. INTERACTIVE MEI VOICE LINES & GREETINGS
 * -------------------------------------------------------------------------- */
const meiQuotes = [
  "Halo kak! Aku Mei, mahasiswi 18 tahun sekaligus asisten resmi server Discord Mei Labs! ✨",
  "Lagi butuh bantuan moderasi atau mau dengerin lagu bareng di voice channel? Mei siap sedia 24/7! 🎵",
  "Yuk grinding XP dan main mini-game bareng! Ada AI Dungeon RPG, Hunt, Fish, dan Farm juga lho! 🎣🌾",
  "Semua pesan dan pertanyaan di server bisa Mei jawab otomatis pakai Google Gemini AI cerdas! 🤖",
  "Server Minecraft Hyrost kamu juga bisa dipantau status dan pemain aktifnya langsung lewat `!mcstatus`! ⛏️",
  "Jangan lupa ambil daily reward kamu hari ini dengan ketik `!daily` ya kak! 💰",
  "Ada yang coba spam di server? Sistem auto-mod, log moderasi, dan verifikasi captcha Mei siap menghadang! 🛡️"
];

let quoteIndex = 0;
function initVoiceQuotes() {
  const quoteEl = document.getElementById('meiQuoteText');
  const bubble = document.getElementById('characterQuoteBubble');
  if (!quoteEl || !bubble) return;

  bubble.addEventListener('click', () => {
    quoteIndex = (quoteIndex + 1) % meiQuotes.length;
    quoteEl.style.opacity = '0';
    quoteEl.style.transform = 'translateY(-4px)';
    
    setTimeout(() => {
      quoteEl.textContent = `"${meiQuotes[quoteIndex]}"`;
      quoteEl.style.opacity = '1';
      quoteEl.style.transform = 'translateY(0)';
    }, 150);
  });
}

/* -----------------------------------------------------------------------------
 * 3. LIVE MEI AI CHAT SIMULATOR (Powered by Mei Persona & Gemini AI)
 * -------------------------------------------------------------------------- */
const botResponses = {
  greetings: [
    "Halo kak! Senang banget bisa ketemu kakak di sini! Ada yang bisa Mei bantu untuk server Discord kakak hari ini? ✨",
    "Hai halo! Mei di sini, asisten resmi Mei Labs siap membantu kelola server dan seru-seruan bareng teman-teman! 🎉"
  ],
  features: [
    "Fitur unggulan Mei lengkap banget kak! Di antaranya:\n• 🤖 **AI Auto-Chat (Gemini)**: Obrolan pintar & konsultasi langsung di channel (`!aichannel`).\n• 📈 **Leveling & Rank Cards**: Kartu profil custom bertema `cyber`, `discord`, atau `emerald`!\n• 💰 **Ekonomi & RPG**: Hunt, Fish, Farm, Dungeon RPG, Market Lelang, dan Toko Item.\n• 🎵 **Lavalink Music HQ**: 3 node audio 320kbps dengan filter bassboost & 8D audio.\n• 🛡️ **Master Setup & Auto-Mod**: Dashboard terpadu 14 kategori pengaturan server (`!setup`).\n• 🎫 **Tiket & Embed Builder**: Pembuat embed Discohook interaktif (`!embed`).\n• ⛏️ **Minecraft Realm**: Cek status server Hyrost real-time!",
  ],
  economy: [
    "Sistem ekonomi Mei seru banget! Kamu bisa kerja dengan `!work`, ambil gaji harian `!daily`, klaim reward mingguan `!weekly` & bulanan `!monthly`. Kamu juga bisa beli Gaming PC, Mobil, Rumah, hingga Private Jet di `!shop`, mancing ikan langka dengan `!fish`, berkebun dengan `!farm`, atau berburu monster dengan `!hunt`! 💰🎮",
  ],
  leveling: [
    "Di sistem Leveling Mei Labs, setiap pesan kamu menghasilkan 5-15 XP. Ada gelar keren dari level kamu:\n• Lv 1-5: Rookie 🌱\n• Lv 6-10: Beginner 🌿\n• Lv 11-20: Active ⭐\n• Lv 21-35: Skilled 🔥\n• Lv 36-50: Expert 💎\n• Lv 51+: Legend 👑\nKamu bisa ganti tema kartu dengan `!rank cyber`, `!rank discord`, atau `!rank emerald`!",
  ],
  setup: [
    "Ketik `!setup` untuk membuka Master Dashboard! Ada 14 kategori pengaturan mulai dari RPG, Voice Generator, Welcome, Moderation Log, Anti-Raid, Verification Captcha, hingga UI Embed Colors! 🎛️",
  ],
  invite: [
    "Cara undang Mei gampang banget! Kakak tinggal klik tombol **'Undang Mei Sekarang'** di atas atau pilih izin yang diinginkan lewat popup invite. Begitu masuk, ketik `!help` atau `!setup` ya! 🚀",
  ],
  joke: [
    "Kenapa programmer suka pakai kacamata gelap? Soalnya mereka nggak tahan lihat bug yang terlalu terang! 😆 Hehehe, jangan lupa santai sejenak ya kak!",
    "Kenapa server Discord suka makan mie instan? Karena kalau error tinggal di-*re-cook* (reboot) langsung enak lagi! 🍜😂"
  ],
  minecraft: [
    "Status Server Hyrost saat ini: **🟢 ONLINE** (Uptime: 99.9%)\nIP: `play.hyrost.net`\nPemain Aktif: 128 / 500 pemain.\nKamu bisa cek langsung kapan saja dengan perintah `!mcstatus` atau `!minecraft`!",
  ],
  default: [
    "Wah menarik banget kak! Sebagai asisten pintar Discord, Mei bisa langsung jalankan tugas itu di server kamu. Mau coba ketik `!help`, `!setup`, atau eksplor menu fitur di bawah?",
    "Siap kak! Di server Discord aslinya, Mei terhubung dengan Google Gemini AI canggih sehingga bisa menjawab pertanyaan kompleks, menerjemahkan bahasa, hingga menganalisis teks komunitas! 💡"
  ]
};

function initAIChatSimulator() {
  const chatArea = document.getElementById('chatMessagesArea');
  const chatInput = document.getElementById('chatUserInput');
  const sendBtn = document.getElementById('chatSendBtn');
  const typingInd = document.getElementById('typingIndicator');
  const quickBtns = document.querySelectorAll('.quick-prompt-btn');

  if (!chatArea || !chatInput || !sendBtn) return;

  function appendMessage(sender, text, isBot = false) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgDiv = document.createElement('div');
    msgDiv.className = 'discord-msg';
    
    const avatarSrc = isBot ? 'assets/images/mei-avatar.jpg' : 'https://ui-avatars.com/api/?name=User&background=5865F2&color=fff';
    const tagHtml = isBot ? '<span class="msg-bot-tag">BOT</span>' : '';
    const authorName = isBot ? 'Mei' : 'Kakak Pengunjung';
    const authorColor = isBot ? '#FF3385' : '#57F287';

    let formattedText = text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code>$1</code>');

    msgDiv.innerHTML = `
      <img src="${avatarSrc}" alt="${authorName}" class="msg-avatar" onerror="this.src='assets/images/mei-avatar.jpg'">
      <div class="msg-body">
        <div class="msg-header">
          <span class="msg-author" style="color: ${authorColor};">${authorName}</span>
          ${tagHtml}
          <span class="msg-time">Hari ini pukul ${timeStr}</span>
        </div>
        <div class="msg-text">${formattedText}</div>
      </div>
    `;

    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function handleUserSubmit(userText) {
    const text = (userText || chatInput.value).trim();
    if (!text) return;

    appendMessage('User', text, false);
    if (!userText) chatInput.value = '';

    if (typingInd) typingInd.style.display = 'flex';
    chatArea.scrollTop = chatArea.scrollHeight;

    const lower = text.toLowerCase();
    let reply = '';

    setTimeout(() => {
      if (lower.includes('halo') || lower.includes('hai') || lower.includes('pagi') || lower.includes('siang') || lower.includes('malam') || lower.includes('hei')) {
        reply = botResponses.greetings[Math.floor(Math.random() * botResponses.greetings.length)];
      } else if (lower.includes('fitur') || lower.includes('bisa apa') || lower.includes('keunggulan') || lower.includes('menu')) {
        reply = botResponses.features[0];
      } else if (lower.includes('ekonomi') || lower.includes('uang') || lower.includes('koin') || lower.includes('kerja') || lower.includes('daily') || lower.includes('shop') || lower.includes('mancing') || lower.includes('hunt') || lower.includes('farm')) {
        reply = botResponses.economy[0];
      } else if (lower.includes('level') || lower.includes('xp') || lower.includes('rank') || lower.includes('kartu')) {
        reply = botResponses.leveling[0];
      } else if (lower.includes('setup') || lower.includes('setting') || lower.includes('dashboard') || lower.includes('konfigurasi')) {
        reply = botResponses.setup[0];
      } else if (lower.includes('undang') || lower.includes('invite') || lower.includes('masuk')) {
        reply = botResponses.invite[0];
      } else if (lower.includes('lelucon') || lower.includes('joke') || lower.includes('lucu') || lower.includes('ketawa')) {
        reply = botResponses.joke[Math.floor(Math.random() * botResponses.joke.length)];
      } else if (lower.includes('minecraft') || lower.includes('mc') || lower.includes('hyrost') || lower.includes('server')) {
        reply = botResponses.minecraft[0];
      } else {
        reply = botResponses.default[Math.floor(Math.random() * botResponses.default.length)];
      }

      if (typingInd) typingInd.style.display = 'none';
      appendMessage('Mei', reply, true);
    }, 600 + Math.random() * 400);
  }

  sendBtn.addEventListener('click', () => handleUserSubmit());
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUserSubmit();
    }
  });

  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt') || btn.textContent.trim();
      handleUserSubmit(prompt);
    });
  });
}

/* -----------------------------------------------------------------------------
 * 4. FEATURE TAB CONTROLLER
 * -------------------------------------------------------------------------- */
function initFeatureTabs() {
  const tabBtns = document.querySelectorAll('.feature-tabs-nav .tab-btn');
  const tabContents = document.querySelectorAll('.feature-tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetEl = document.getElementById(`tab-${targetId}`);
      if (targetEl) targetEl.classList.add('active');
    });
  });
}

/* -----------------------------------------------------------------------------
 * 5. LAVALINK MUSIC PLAYER SIMULATOR
 * -------------------------------------------------------------------------- */
function initMusicPlayer() {
  const playBtn = document.getElementById('musicPlayBtn');
  const statusEl = document.getElementById('musicTrackStatus');
  const eqBars = document.querySelectorAll('.audio-equalizer .eq-bar');
  if (!playBtn) return;

  let isPlaying = true;

  playBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    if (statusEl) {
      statusEl.textContent = isPlaying 
        ? 'Sedang Memutar • MilloHost-v4-SSL (320kbps)' 
        : 'Dijeda • Lavalink Node Siap';
    }

    eqBars.forEach(bar => {
      bar.style.animationPlayState = isPlaying ? 'running' : 'paused';
    });

    showToast(isPlaying ? '🎵 Musik dilanjutkan (Lavalink HQ)' : '⏸️ Musik dijeda');
  });
}

/* -----------------------------------------------------------------------------
 * 6. RANK CARD GENERATOR & CUSTOMIZER
 * -------------------------------------------------------------------------- */
const LEVEL_TITLES = [
  { maxLevel: 5, title: 'Rookie', emoji: '🌱' },
  { maxLevel: 10, title: 'Beginner', emoji: '🌿' },
  { maxLevel: 20, title: 'Active', emoji: '⭐' },
  { maxLevel: 35, title: 'Skilled', emoji: '🔥' },
  { maxLevel: 50, title: 'Expert', emoji: '💎' },
  { maxLevel: 999, title: 'Legend', emoji: '👑' }
];

const THEME_PRESETS = {
  cyber: {
    bg: 'linear-gradient(135deg, #18092e, #291147, #130726)',
    accent: '#a855f7',
    accent2: '#ec4899',
    border: '#a855f7',
    bar: 'linear-gradient(90deg, #a855f7, #ec4899)'
  },
  discord: {
    bg: 'linear-gradient(135deg, #0f142b, #1e264f, #0d1024)',
    accent: '#5865F2',
    accent2: '#7983f5',
    border: '#5865F2',
    bar: 'linear-gradient(90deg, #5865F2, #00D26A)'
  },
  emerald: {
    bg: 'linear-gradient(135deg, #072618, #0e402b, #04170f)',
    accent: '#10b981',
    accent2: '#34d399',
    border: '#10b981',
    bar: 'linear-gradient(90deg, #10b981, #34d399)'
  },
  gold: {
    bg: 'linear-gradient(135deg, #2b1f07, #3d2c0b, #1f1605)',
    accent: '#FEE75C',
    accent2: '#FF9900',
    border: '#FEE75C',
    bar: 'linear-gradient(90deg, #FEE75C, #FF9900)'
  }
};

function initRankCardGenerator() {
  const nameInput = document.getElementById('rankInputName');
  const tagInput = document.getElementById('rankInputTag');
  const levelInput = document.getElementById('rankInputLevel');
  const xpInput = document.getElementById('rankInputXP');
  const swatches = document.querySelectorAll('.color-swatch');

  const cardUsername = document.getElementById('cardUsername');
  const cardTag = document.getElementById('cardTag');
  const cardLevelNum = document.getElementById('cardLevelNum');
  const cardRankNum = document.getElementById('cardRankNum');
  const cardTitleBadge = document.getElementById('cardTitleBadge');
  const cardXpCurrent = document.getElementById('cardXpCurrent');
  const cardXpTarget = document.getElementById('cardXpTarget');
  const cardProgressBar = document.getElementById('cardProgressBar');
  const rankCardCanvas = document.getElementById('rankCardCanvas');

  if (!nameInput || !levelInput || !cardUsername) return;

  function getLevelTitle(level) {
    for (const t of LEVEL_TITLES) {
      if (level <= t.maxLevel) return `${t.emoji} ${t.title}`;
    }
    return '👑 Legend';
  }

  function updateCard() {
    const name = nameInput.value || 'Iko Dev';
    const tag = tagInput.value || '#0001';
    const level = parseInt(levelInput.value, 10) || 1;
    const xpPercent = parseInt(xpInput.value, 10) || 75;

    cardUsername.textContent = name;
    cardTag.textContent = tag.startsWith('#') ? tag : `#${tag}`;
    cardLevelNum.textContent = level;
    cardRankNum.textContent = level > 50 ? '#1' : level > 20 ? '#4' : '#12';
    
    if (cardTitleBadge) {
      cardTitleBadge.textContent = getLevelTitle(level);
    }

    const targetXpVal = level * 1000;
    const currentXpVal = Math.round((xpPercent / 100) * targetXpVal);
    
    cardXpCurrent.textContent = currentXpVal.toLocaleString();
    cardXpTarget.textContent = targetXpVal.toLocaleString();
    cardProgressBar.style.width = `${Math.min(100, Math.max(5, xpPercent))}%`;
  }

  nameInput.addEventListener('input', updateCard);
  tagInput.addEventListener('input', updateCard);
  levelInput.addEventListener('input', updateCard);
  xpInput.addEventListener('input', updateCard);

  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const themeKey = swatch.getAttribute('data-theme') || 'cyber';
      const theme = THEME_PRESETS[themeKey] || THEME_PRESETS.cyber;

      if (rankCardCanvas) {
        rankCardCanvas.style.background = theme.bg;
        rankCardCanvas.style.borderColor = theme.border;
        cardProgressBar.style.background = theme.bar;
      }
    });
  });

  updateCard();
}

/* -----------------------------------------------------------------------------
 * 7. COMPLETE DISCORD BOT COMMAND CATALOG (197 Real Commands)
 * -------------------------------------------------------------------------- */
const botCommands = [
  // AI & Gemini
  { name: '!ask', slash: '/ask', cat: 'AI', desc: 'Tanya apa saja ke Mei bertenaga AI Google Gemini.', aliases: ['ai', 'tanya', 'gemini'] },
  { name: '!toggleai', slash: '/toggleai', cat: 'AI', desc: 'Aktifkan atau nonaktifkan AI auto-chat per server.', aliases: ['aistatus'] },
  { name: '!aichannel', slash: '/aichannel', cat: 'AI', desc: 'Atur channel khusus untuk ngobrol otomatis dengan Mei AI.', aliases: ['setaichannel'] },

  // General Commands (47 commands)
  { name: '!help', slash: '/help', cat: 'General', desc: 'Menampilkan katalog panduan lengkap seluruh command bot.', aliases: ['h', 'menu'] },
  { name: '!helpowner', slash: '/helpowner', cat: 'General', desc: 'Bantuan khusus perintah pemilik/developer bot.', aliases: ['howner'] },
  { name: '!ping', slash: '/ping', cat: 'General', desc: 'Cek latensi WebSocket bot dan API Discord real-time.', aliases: ['latency', 'p'] },
  { name: '!pingapi', slash: '/pingapi', cat: 'General', desc: 'Tes konektivitas ke API eksternal (OpenWeather, Wikipedia, dll).', aliases: ['apiping'] },
  { name: '!about', slash: '/about', cat: 'General', desc: 'Tentang Mei Labs, developer, versi, dan teknologi bot.', aliases: ['botinfo', 'info'] },
  { name: '!userinfo', slash: '/userinfo', cat: 'General', desc: 'Lihat info akun, role, tanggal bergabung, dan status member.', aliases: ['uinfo', 'whois'] },
  { name: '!serverinfo', slash: '/serverinfo', cat: 'General', desc: 'Informasi lengkap server, owner, boost, dan channel.', aliases: ['sinfo'] },
  { name: '!servers', slash: '/servers', cat: 'General', desc: 'Daftar server yang menggunakan bot Mei Labs (Owner/Admin).', aliases: ['guilds'] },
  { name: '!rep', slash: '/rep', cat: 'General', desc: 'Berikan poin reputasi harian kepada member server.', aliases: ['reputation'] },
  { name: '!toprep', slash: '/toprep', cat: 'General', desc: 'Papan peringkat member dengan reputasi tertinggi.', aliases: ['repleaderboard'] },
  { name: '!marry', slash: '/marry', cat: 'General', desc: 'Menikah virtual dengan sesama member di server.', aliases: ['nikah'] },
  { name: '!divorce', slash: '/divorce', cat: 'General', desc: 'Bercerai dari pasangan virtual di server.', aliases: ['cerai'] },
  { name: '!relationship', slash: '/relationship', cat: 'General', desc: 'Status hubungan pernikahan virtual dan tanggal jadian.', aliases: ['relasi', 'statusnikah'] },
  { name: '!achievements', slash: '/achievements', cat: 'General', desc: 'Daftar pencapaian & badge yang telah terbuka di server.', aliases: ['ach'] },
  { name: '!adventure', slash: '/adventure', cat: 'General', desc: 'Petualangan RPG dungeon menjelajahi pulau misteri berhadiah loot.', aliases: ['adv', 'dungeon'] },
  { name: '!poll', slash: '/poll', cat: 'General', desc: 'Buat voting/polling interaktif dengan reaksi otomatis.', aliases: ['voting'] },
  { name: '!calc', slash: '/calc', cat: 'General', desc: 'Kalkulator matematika pintar untuk ekspresi angka.', aliases: ['hitung'] },
  { name: '!choose', slash: '/choose', cat: 'General', desc: 'Mei akan memilih secara acak dari opsi yang diberikan.', aliases: ['pilih'] },
  { name: '!countdown', slash: '/countdown', cat: 'General', desc: 'Hitung mundur waktu ke tanggal atau acara penting.', aliases: ['timerdate'] },
  { name: '!define', slash: '/define', cat: 'General', desc: 'Cari definisi kata kamus Bahasa Inggris / Indonesia.', aliases: ['arti'] },
  { name: '!translate', slash: '/translate', cat: 'General', desc: 'Terjemahkan teks antar bahasa secara instan.', aliases: ['tr'] },
  { name: '!wikipedia', slash: '/wikipedia', cat: 'General', desc: 'Cari artikel ringkasan dari ensiklopedia Wikipedia.', aliases: ['wiki'] },
  { name: '!google', slash: '/google', cat: 'General', desc: 'Pencarian web Google langsung di channel Discord.', aliases: ['search'] },
  { name: '!youtube', slash: '/youtube', cat: 'General', desc: 'Cari video di YouTube dengan thumbnail dan durasi.', aliases: ['yt'] },
  { name: '!firstmessage', slash: '/firstmessage', cat: 'General', desc: 'Lompat ke pesan pertama yang pernah dikirim di channel.', aliases: ['firstmsg'] },
  { name: '!stats', slash: '/stats', cat: 'General', desc: 'Statistik penggunaan memori, server, uptime, dan sharding.', aliases: ['botstats'] },
  { name: '!uptime', slash: '/uptime', cat: 'General', desc: 'Lama waktu bot telah online tanpa henti.', aliases: ['up'] },
  { name: '!vote', slash: '/vote', cat: 'General', desc: 'Dukung bot di Top.gg dan dapatkan bonus reward!', aliases: ['topgg'] },
  { name: '!invite', slash: '/invite', cat: 'General', desc: 'Link resmi untuk mengundang Mei Labs ke server lain.', aliases: ['botlink'] },
  { name: '!rules', slash: '/rules', cat: 'General', desc: 'Tampilkan tata tertib dan panduan komunitas server.', aliases: ['aturan'] },
  { name: '!leaveserver', slash: '/leaveserver', cat: 'General', desc: 'Perintahkan bot meninggalkan server (Owner).', aliases: ['leaveguild'] },
  { name: '!broadcast', slash: '/broadcast', cat: 'General', desc: 'Kirim siaran pesan ke seluruh server bot (Owner).', aliases: ['bc'] },
  { name: '!blacklist', slash: '/blacklist', cat: 'General', desc: 'Blacklist pengguna dari pemakaian bot (Owner).', aliases: ['bl'] },
  { name: '!unblacklist', slash: '/unblacklist', cat: 'General', desc: 'Buka blokir blacklist pengguna (Owner).', aliases: ['unbl'] },
  { name: '!reloadconfig', slash: '/reloadconfig', cat: 'General', desc: 'Muat ulang file config.yml tanpa restart.', aliases: ['rlconfig'] },
  { name: '!viewconfig', slash: '/viewconfig', cat: 'General', desc: 'Lihat konfigurasi bot yang sedang berjalan.', aliases: ['showconfig'] },
  { name: '!eval', slash: '/eval', cat: 'General', desc: 'Eksekusi kode JavaScript langsung (Owner sandbox).', aliases: ['ev'] },
  { name: '!setprefix', slash: '/setprefix', cat: 'General', desc: 'Ubah prefix perintah bot di server Anda.', aliases: ['prefix'] },
  { name: '!dbstats', slash: '/dbstats', cat: 'General', desc: 'Statistik dokumen dan koleksi MongoDB.', aliases: ['mongostats'] },
  { name: '!backupdb', slash: '/backupdb', cat: 'General', desc: 'Ekspor cadangan database MongoDB ke file JSON.', aliases: ['dumpdb'] },
  { name: '!restoredb', slash: '/restoredb', cat: 'General', desc: 'Pulihkan database dari file cadangan JSON.', aliases: ['importdb'] },
  { name: '!cleardb', slash: '/cleardb', cat: 'General', desc: 'Bersihkan data database sementara.', aliases: ['dropcache'] },
  { name: '!testdb', slash: '/testdb', cat: 'General', desc: 'Uji kecepatan baca/tulis koneksi database.', aliases: ['pingdb'] },
  { name: '!update', slash: '/update', cat: 'General', desc: 'Lihat catatan pembaruan & changelog bot terbaru.', aliases: ['changelog'] },
  { name: '!wiki', slash: '/wiki', cat: 'General', desc: 'Panduan lengkap sistem Mei Labs dalam embed interaktif.', aliases: ['panduan'] },

  // Economy & RPG Commands (25 commands)
  { name: '!balance', slash: '/balance', cat: 'Economy', desc: 'Lihat saldo dompet (Cash) dan tabungan Bank saat ini.', aliases: ['bal', 'money', 'saldo'] },
  { name: '!daily', slash: '/daily', cat: 'Economy', desc: 'Klaim hadiah reward koin harian (100 - 500 MC).', aliases: ['gajian'] },
  { name: '!work', slash: '/work', cat: 'Economy', desc: 'Bekerja virtual dan dapatkan koin (Cooldown: 1 jam).', aliases: ['kerja'] },
  { name: '!deposit', slash: '/deposit', cat: 'Economy', desc: 'Simpan koin dari dompet ke dalam bank agar aman dari curian.', aliases: ['dep'] },
  { name: '!withdraw', slash: '/withdraw', cat: 'Economy', desc: 'Tarik saldo koin dari bank ke dompet.', aliases: ['wd'] },
  { name: '!pay', slash: '/pay', cat: 'Economy', desc: 'Kirim koin ke pengguna lain di server.', aliases: ['transfer', 'tf'] },
  { name: '!give', slash: '/give', cat: 'Economy', desc: 'Beri koin atau item kepada member lain (Admin/Owner).', aliases: ['givemoney'] },
  { name: '!rob', slash: '/rob', cat: 'Economy', desc: 'Curi koin dari dompet member lain (Peluang 50%, ada denda 30%!).', aliases: ['curi', 'rampok'] },
  { name: '!shop', slash: '/shop', cat: 'Economy', desc: 'Buka katalog toko item (Gaming PC, Mobil, Rumah, Jet, dll).', aliases: ['market', 'toko'] },
  { name: '!buy', slash: '/buy', cat: 'Economy', desc: 'Beli barang dari toko menggunakan saldo koin.', aliases: ['beli'] },
  { name: '!sell', slash: '/sell', cat: 'Economy', desc: 'Jual barang hasil mancing, berburu, atau item toko.', aliases: ['jual'] },
  { name: '!inventory', slash: '/inventory', cat: 'Economy', desc: 'Lihat isi tas ransel, senjata, dan koleksi item kamu.', aliases: ['inv', 'tas'] },
  { name: '!hunt', slash: '/hunt', cat: 'Economy', desc: 'Berburu hewan buas & monster di 4 zona alam liar.', aliases: ['berburu'] },
  { name: '!fish', slash: '/fish', cat: 'Economy', desc: 'Memancing ikan biasa hingga ikan langka di danau.', aliases: ['mancing'] },
  { name: '!farm', slash: '/farm', cat: 'Economy', desc: 'Tanam padi, gandum, sayur, dan panen hasil kebun.', aliases: ['kebun', 'tani'] },
  { name: '!bounty', slash: '/bounty', cat: 'Economy', desc: 'Pasang uang buronan atas kepala member target.', aliases: ['buronan'] },
  { name: '!market', slash: '/market', cat: 'Economy', desc: 'Pasar lelang P2P jual-beli item antar member (Fee 2%).', aliases: ['pasar'] },
  { name: '!auction', slash: '/auction', cat: 'Economy', desc: 'Lelang barang langka kepada penawar tertinggi.', aliases: ['lelang'] },
  { name: '!slots', slash: '/slots', cat: 'Economy', desc: 'Mesin slot jackpot keberuntungan 3 baris.', aliases: ['slot'] },
  { name: '!coinflip', slash: '/coinflip', cat: 'Economy', desc: 'Taruhan lempar koin Head atau Tail.', aliases: ['cf'] },
  { name: '!bet', slash: '/bet', cat: 'Economy', desc: 'Pasang taruhan angka koin keberuntungan.', aliases: ['judi'] },
  { name: '!gamble', slash: '/gamble', cat: 'Economy', desc: 'Gamble lempar dadu melawan bandar Mei.', aliases: ['dadu'] },
  { name: '!topfish', slash: '/topfish', cat: 'Economy', desc: 'Leaderboard pemancing dengan tangkapan terbesar.', aliases: ['tangkapan'] },
  { name: '!tophunt', slash: '/tophunt', cat: 'Economy', desc: 'Leaderboard pemburu monster terhebat.', aliases: ['buruan'] },
  { name: '!leaderboard', slash: '/leaderboard', cat: 'Economy', desc: 'Papan peringkat member terkaya di server.', aliases: ['top', 'rich'] },

  // Leveling Commands (15 commands)
  { name: '!rank', slash: '/rank', cat: 'Leveling', desc: 'Cek kartu level, rank leaderboard, dan progres XP (!rank cyber/discord/emerald).', aliases: ['level', 'lvl'] },
  { name: '!xp', slash: '/xp', cat: 'Leveling', desc: 'Lihat jumlah XP yang dibutuhkan untuk level berikutnya.', aliases: ['myxp'] },
  { name: '!skills', slash: '/skills', cat: 'Leveling', desc: 'Skill tree RPG: Agility, Fortune, Merchant, dan Combat.', aliases: ['keahlian'] },
  { name: '!streak', slash: '/streak', cat: 'Leveling', desc: 'Hitung streak aktif chat harian berturut-turut.', aliases: ['dailyactivity'] },
  { name: '!quest', slash: '/quest', cat: 'Leveling', desc: 'Daftar misi harian & mingguan berhadiah XP & Koin.', aliases: ['misi'] },
  { name: '!themes', slash: '/themes', cat: 'Leveling', desc: 'Pilih tema tampilan kartu rank profil kustom.', aliases: ['ranktheme'] },
  { name: '!weekly', slash: '/weekly', cat: 'Leveling', desc: 'Klaim gaji reward mingguan (5,000 + 500-1500 MC).', aliases: ['mingguan'] },
  { name: '!monthly', slash: '/monthly', cat: 'Leveling', desc: 'Klaim reward bulanan member aktif (20,000 + 2000-7000 MC).', aliases: ['bulanan'] },
  { name: '!yearly', slash: '/yearly', cat: 'Leveling', desc: 'Bonus reward tahunan (100,000 + 10,000-30,000 MC).', aliases: ['tahunan'] },
  { name: '!levelnotifications', slash: '/levelnotifications', cat: 'Leveling', desc: 'Atur notifikasi saat naik level (DM/Channel/Mati).', aliases: ['levelnotif'] },
  { name: '!addxp', slash: '/addxp', cat: 'Leveling', desc: 'Tambahkan XP secara manual ke pengguna (Admin).', aliases: ['tambahxp'] },
  { name: '!removexp', slash: '/removexp', cat: 'Leveling', desc: 'Kurangi XP pengguna yang melanggar aturan (Admin).', aliases: ['kurangxp'] },
  { name: '!setxp', slash: '/setxp', cat: 'Leveling', desc: 'Set jumlah XP pengguna secara spesifik (Admin).', aliases: ['aturxp'] },
  { name: '!resetlevel', slash: '/resetlevel', cat: 'Leveling', desc: 'Reset level pengguna atau seluruh server (Admin).', aliases: ['resettotal'] },

  // Moderation & Setup Commands (37 commands)
  { name: '!setup', slash: '/setup', cat: 'Moderation', desc: 'Buka Master Server Setup Dashboard (14 Kategori Pengaturan).', aliases: ['dashboard', 'config'] },
  { name: '!features', slash: '/features', cat: 'Moderation', desc: 'Saklar aktif/nonaktif 23 fitur modular per server.', aliases: ['saklar'] },
  { name: '!embed', slash: '/embed', cat: 'Moderation', desc: 'Interactive Embed Builder dengan preset Announcement, Rules, Partner, Giveaway, VIP.', aliases: ['buildembed'] },
  { name: '!announce', slash: '/announce', cat: 'Moderation', desc: 'Kirim pengumuman resmi server berformat embed rapi.', aliases: ['pengumuman'] },
  { name: '!partner', slash: '/partner', cat: 'Moderation', desc: 'Kirim panel partnership komunitas resmi.', aliases: ['kemitraan'] },
  { name: '!giveaway', slash: '/giveaway', cat: 'Moderation', desc: 'Mulai event giveaway berhadiah dengan timer otomatis.', aliases: ['gstart'] },
  { name: '!takerole', slash: '/takerole', cat: 'Moderation', desc: 'Pasang panel ambil role mandiri (Self-Roles) dengan dropdown.', aliases: ['selfrole', 'rolemenu'] },
  { name: '!reactionrole', slash: '/reactionrole', cat: 'Moderation', desc: 'Buat pesan ambil role melalui reaksi emoji Discord.', aliases: ['rr'] },
  { name: '!tempvoice', slash: '/tempvoice', cat: 'Moderation', desc: 'Setup sistem generator temporary voice channel otomatis.', aliases: ['autovoice'] },
  { name: '!ticket', slash: '/ticket', cat: 'Moderation', desc: 'Setup sistem tiket bantuan support Discohook.', aliases: ['bantuan'] },
  { name: '!verify', slash: '/verify', cat: 'Moderation', desc: 'Setup sistem verifikasi captcha (Math & Emoji) anti-raid.', aliases: ['verifikasi'] },
  { name: '!verifyuser', slash: '/verifyuser', cat: 'Moderation', desc: 'Verifikasi akun member secara manual oleh staf.', aliases: ['accuser'] },
  { name: '!automod', slash: '/automod', cat: 'Moderation', desc: 'Atur filter anti-spam, anti-invites, dan anti-capslock.', aliases: ['autoprotect'] },
  { name: '!kick', slash: '/kick', cat: 'Moderation', desc: 'Keluarkan member dari server Discord.', aliases: ['tendang'] },
  { name: '!ban', slash: '/ban', cat: 'Moderation', desc: 'Ban permanen member yang melanggar aturan.', aliases: ['banned'] },
  { name: '!softban', slash: '/softban', cat: 'Moderation', desc: 'Ban lalu unban untuk membersihkan seluruh pesan member.', aliases: ['cleanban'] },
  { name: '!hackban', slash: '/hackban', cat: 'Moderation', desc: 'Ban pengguna berdasarkan User ID (walau belum join server).', aliases: ['idban'] },
  { name: '!unban', slash: '/unban', cat: 'Moderation', desc: 'Buka blokir ban pengguna dari server.', aliases: ['bukaunban'] },
  { name: '!mute', slash: '/mute', cat: 'Moderation', desc: 'Bungkam member dengan role Muted otomatis.', aliases: ['timeout'] },
  { name: '!unmute', slash: '/unmute', cat: 'Moderation', desc: 'Buka pembungkaman role Muted dari member.', aliases: ['lepasmute'] },
  { name: '!warn', slash: '/warn', cat: 'Moderation', desc: 'Beri peringatan resmi ke member dan simpan di database.', aliases: ['peringatan'] },
  { name: '!warnings', slash: '/warnings', cat: 'Moderation', desc: 'Lihat riwayat seluruh peringatan member.', aliases: ['warnlist'] },
  { name: '!case', slash: '/case', cat: 'Moderation', desc: 'Cari detail kasus moderasi berdasarkan Case ID.', aliases: ['modcase'] },
  { name: '!modnote', slash: '/modnote', cat: 'Moderation', desc: 'Catatan internal staf moderator untuk member tertentu.', aliases: ['catatanmod'] },
  { name: '!clear', slash: '/clear', cat: 'Moderation', desc: 'Hapus pesan massal dalam channel (1 - 100 pesan).', aliases: ['purge', 'hapus'] },
  { name: '!lock', slash: '/lock', cat: 'Moderation', desc: 'Kunci channel agar member biasa tidak bisa mengirim pesan.', aliases: ['kunci'] },
  { name: '!unlock', slash: '/unlock', cat: 'Moderation', desc: 'Buka kembali kunci channel yang dikunci.', aliases: ['bukakunci'] },
  { name: '!slowmode', slash: '/slowmode', cat: 'Moderation', desc: 'Atur jeda waktu lambat chat di channel (detik).', aliases: ['sm'] },
  { name: '!nickname', slash: '/nickname', cat: 'Moderation', desc: 'Ubah nama panggilan (nickname) member di server.', aliases: ['setnick'] },
  { name: '!suggest', slash: '/suggest', cat: 'Moderation', desc: 'Kirim saran untuk server ke channel saran komunitas.', aliases: ['saran'] },
  { name: '!report', slash: '/report', cat: 'Moderation', desc: 'Laporkan pelanggar aturan ke staf moderator secara privat.', aliases: ['lapor'] },
  { name: '!welcome', slash: '/welcome', cat: 'Moderation', desc: 'Atur pesan penyambutan member baru dan perpisahan.', aliases: ['sambutan'] },
  { name: '!schedule', slash: '/schedule', cat: 'Moderation', desc: 'Jadwalkan pengiriman pesan otomatis di waktu tertentu.', aliases: ['jadwal'] },
  { name: '!modonly', slash: '/modonly', cat: 'Moderation', desc: 'Kunci channel khusus untuk staf moderator saja.', aliases: ['staffonly'] },
  { name: '!faq', slash: '/faq', cat: 'Moderation', desc: 'Kirim jawaban pertanyaan umum komunitas server.', aliases: ['tanyajawab'] },
  { name: '!dm', slash: '/dm', cat: 'Moderation', desc: 'Kirim pesan langsung ke DM pengguna (Admin).', aliases: ['directmessage'] },

  // Music HQ Commands (16 commands)
  { name: '!play', slash: '/play', cat: 'Music', desc: 'Putar lagu dari YouTube, Spotify, Soundcloud via node Lavalink.', aliases: ['p'] },
  { name: '!pause', slash: '/pause', cat: 'Music', desc: 'Jeda sementara lagu yang sedang diputar.', aliases: ['jeda'] },
  { name: '!resume', slash: '/resume', cat: 'Music', desc: 'Lanjutkan kembali pemutaran lagu yang dijeda.', aliases: ['lanjut'] },
  { name: '!skip', slash: '/skip', cat: 'Music', desc: 'Lewati lagu saat ini dan lanjut ke lagu antrean berikutnya.', aliases: ['s', 'next'] },
  { name: '!stop', slash: '/stop', cat: 'Music', desc: 'Hentikan pemutaran musik dan bersihkan antrean.', aliases: ['berhenti'] },
  { name: '!queue', slash: '/queue', cat: 'Music', desc: 'Lihat daftar antrean lagu yang akan diputar.', aliases: ['q'] },
  { name: '!nowplaying', slash: '/nowplaying', cat: 'Music', desc: 'Informasi detail lagu yang sedang diputar & progress bar.', aliases: ['np'] },
  { name: '!volume', slash: '/volume', cat: 'Music', desc: 'Atur volume musik dari 0% hingga 200% (Default: 80%).', aliases: ['vol'] },
  { name: '!loop', slash: '/loop', cat: 'Music', desc: 'Ulangi lagu saat ini (track) atau seluruh antrean (queue).', aliases: ['repeat'] },
  { name: '!8d', slash: '/8d', cat: 'Music', desc: 'Aktifkan filter audio 8D Surround 360 derajat.', aliases: ['surround'] },
  { name: '!filter', slash: '/filter', cat: 'Music', desc: 'Filter audio: Bassboost, Nightcore, Vaporwave, Pop, Soft.', aliases: ['eq'] },
  { name: '!album', slash: '/album', cat: 'Music', desc: 'Putar satu album atau playlist lagu sekaligus.', aliases: ['playlist'] },
  { name: '!exportqueue', slash: '/exportqueue', cat: 'Music', desc: 'Ekspor daftar antrean lagu ke file teks.', aliases: ['savequeue'] },
  { name: '!syncplaylist', slash: '/syncplaylist', cat: 'Music', desc: 'Sinkronkan playlist Spotify/YouTube pengguna.', aliases: ['syncpl'] },
  { name: '!random', slash: '/random', cat: 'Music', desc: 'Putar lagu secara acak dari playlist komunitas.', aliases: ['acak'] },
  { name: '!setup-music', slash: '/setup-music', cat: 'Music', desc: 'Pasang channel pengontrol musik interaktif 24/7.', aliases: ['musicch'] },

  // Utility Commands (20 commands)
  { name: '!afk', slash: '/afk', cat: 'Utility', desc: 'Pasang status AFK; bot akan membalas otomatis jika ada yang mention.', aliases: ['away'] },
  { name: '!anime', slash: '/anime', cat: 'Utility', desc: 'Cari informasi judul anime, sinopsis, skor, dan episode.', aliases: ['wibu'] },
  { name: '!avatar', slash: '/avatar', cat: 'Utility', desc: 'Lihat dan unduh foto profil member beresolusi tinggi.', aliases: ['av', 'pfp'] },
  { name: '!birthday', slash: '/birthday', cat: 'Utility', desc: 'Daftarkan tanggal ulang tahun dan dapatkan ucapan otomatis.', aliases: ['ultah'] },
  { name: '!hastebin', slash: '/hastebin', cat: 'Utility', desc: 'Upload teks atau kode panjang ke Hastebin secara instan.', aliases: ['bin'] },
  { name: '!invites', slash: '/invites', cat: 'Utility', desc: 'Cek jumlah member yang telah kamu undang ke server.', aliases: ['undangan'] },
  { name: '!minecraft', slash: '/minecraft', cat: 'Utility', desc: 'Cek status online, MOTD, dan pemain server Minecraft.', aliases: ['mcstatus', 'mc'] },
  { name: '!note', slash: '/note', cat: 'Utility', desc: 'Simpan catatan pribadi cepat yang dapat dibuka kapan saja.', aliases: ['catatan'] },
  { name: '!password', slash: '/password', cat: 'Utility', desc: 'Generator password acak yang aman dan kuat.', aliases: ['genpass'] },
  { name: '!qr', slash: '/qr', cat: 'Utility', desc: 'Ubah teks atau URL menjadi gambar QR Code siap scan.', aliases: ['qrcode'] },
  { name: '!remind', slash: '/remind', cat: 'Utility', desc: 'Pasang pengingat waktu custom lewat DM/channel.', aliases: ['ingatkan'] },
  { name: '!serveranalytics', slash: '/serveranalytics', cat: 'Utility', desc: 'Grafik analitik keaktifan chat dan pertumbuhan member.', aliases: ['grafik'] },
  { name: '!serverstats', slash: '/serverstats', cat: 'Utility', desc: 'Setup voice channel dinamis penampil jumlah member live.', aliases: ['statvoice'] },
  { name: '!shorturl', slash: '/shorturl', cat: 'Utility', desc: 'Perpendek tautan URL panjang.', aliases: ['shorten'] },
  { name: '!snipe', slash: '/snipe', cat: 'Utility', desc: 'Tampilkan pesan terakhir yang baru saja dihapus di channel.', aliases: ['intip'] },
  { name: '!steal', slash: '/steal', cat: 'Utility', desc: 'Curi emoji dari server lain dan tambahkan ke server kamu.', aliases: ['curiemoji'] },
  { name: '!timer', slash: '/timer', cat: 'Utility', desc: 'Pasang stopwatch penghitung waktu alarm.', aliases: ['alarm'] },
  { name: '!todo', slash: '/todo', cat: 'Utility', desc: 'Kelola daftar tugas (to-do list) kegiatan harian.', aliases: ['tugas'] },
  { name: '!tts', slash: '/tts', cat: 'Utility', desc: 'Ubah teks menjadi suara di voice channel (Text-to-Speech).', aliases: ['suara'] },
  { name: '!weather', slash: '/weather', cat: 'Utility', desc: 'Perkiraan cuaca kota di seluruh dunia (Suhu & Kelembapan).', aliases: ['cuaca'] },

  // Fun & Mini Games Commands (17 commands)
  { name: '!8ball', slash: '/8ball', cat: 'Fun', desc: 'Tanyakan ramalan bola mistis ajaib 8-Ball.', aliases: ['ramal'] },
  { name: '!advice', slash: '/advice', cat: 'Fun', desc: 'Dapatkan petuah nasehat bijak dari Mei.', aliases: ['nasehat'] },
  { name: '!ascii', slash: '/ascii', cat: 'Fun', desc: 'Ubah teks biasa menjadi tulisan seni ASCII art keren.', aliases: ['art'] },
  { name: '!cat', slash: '/cat', cat: 'Fun', desc: 'Foto kucing lucu & menggemaskan secara acak.', aliases: ['kucing'] },
  { name: '!dog', slash: '/dog', cat: 'Fun', desc: 'Foto anjing lucu & ramah secara acak.', aliases: ['anjing'] },
  { name: '!emojify', slash: '/emojify', cat: 'Fun', desc: 'Ubah seluruh huruf teks menjadi susunan emoji.', aliases: ['emojiteks'] },
  { name: '!fact', slash: '/fact', cat: 'Fun', desc: 'Fakta unik dunia dan ilmu pengetahuan yang mengejutkan.', aliases: ['fakta'] },
  { name: '!hack', slash: '/hack', cat: 'Fun', desc: 'Simulasi bercanda meretas akun member server.', aliases: ['prank'] },
  { name: '!hug', slash: '/hug', cat: 'Fun', desc: 'Peluk member lain dengan animasi GIF anime yang hangat.', aliases: ['peluk'] },
  { name: '!kiss', slash: '/kiss', cat: 'Fun', desc: 'Cium virtual pasangan atau teman di server.', aliases: ['cium'] },
  { name: '!joke', slash: '/joke', cat: 'Fun', desc: 'Minta Mei menceritakan lelucon lucu dan gokil.', aliases: ['lucu'] },
  { name: '!meme', slash: '/meme', cat: 'Fun', desc: 'Kirim meme trending dari Reddit secara acak.', aliases: ['ngakak'] },
  { name: '!reverse', slash: '/reverse', cat: 'Fun', desc: 'Balikkan urutan teks huruf dari belakang ke depan.', aliases: ['balik'] },
  { name: '!roll', slash: '/roll', cat: 'Fun', desc: 'Lempar dadu angka 1 sampai 100.', aliases: ['kocok'] },
  { name: '!rps', slash: '/rps', cat: 'Fun', desc: 'Main suit gunting batu kertas melawan Mei.', aliases: ['suit'] },
  { name: '!ship', slash: '/ship', cat: 'Fun', desc: 'Hitung persentase kecocokan cinta antara dua member.', aliases: ['jodoh'] },
  { name: '!wordle', slash: '/wordle', cat: 'Fun', desc: 'Permainan tebak 5 huruf kata rahasia ala Wordle.', aliases: ['katamisteri'] },

  // Image Manipulation Commands (11 commands)
  { name: '!jail', slash: '/jail', cat: 'Image', desc: 'Masukkan foto profil member ke dalam jeruji penjara.', aliases: ['penjara'] },
  { name: '!trigger', slash: '/trigger', cat: 'Image', desc: 'Efek getar beranimasi TRIGGERED pada foto avatar.', aliases: ['triggered'] },
  { name: '!wasted', slash: '/wasted', cat: 'Image', desc: 'Efek layar abu-abu WASTED ala game GTA.', aliases: ['gta'] },
  { name: '!pixelate', slash: '/pixelate', cat: 'Image', desc: 'Ubah foto profil menjadi berpiksel 8-bit retro.', aliases: ['pixel'] },
  { name: '!blur', slash: '/blur', cat: 'Image', desc: 'Beri efek blur kabur pada gambar profil.', aliases: ['kabur'] },
  { name: '!circle', slash: '/circle', cat: 'Image', desc: 'Potong gambar profil menjadi lingkaran bulat sempurna.', aliases: ['bulat'] },
  { name: '!invert', slash: '/invert', cat: 'Image', desc: 'Balikkan warna gambar profil menjadi efek negatif.', aliases: ['negatif'] },
  { name: '!sepia', slash: '/sepia', cat: 'Image', desc: 'Beri efek filter klasik retro sepia pada foto.', aliases: ['klasik'] },
  { name: '!greyscale', slash: '/greyscale', cat: 'Image', desc: 'Ubah foto profil menjadi hitam putih klasik.', aliases: ['bw'] },
  { name: '!beautiful', slash: '/beautiful', cat: 'Image', desc: 'Letakkan foto profil ke dalam lukisan indah Gravity Falls.', aliases: ['indah'] },
  { name: '!distort', slash: '/distort', cat: 'Image', desc: 'Beri efek distorsi lensa cembung lucu pada foto.', aliases: ['distorsi'] },

  // Plugin & Management Commands (9 commands)
  { name: '!backup', slash: '/backup', cat: 'Plugin', desc: 'Buat cadangan database MongoDB bot secara instan (Owner).', aliases: ['backupdb'] },
  { name: '!botstatus', slash: '/botstatus', cat: 'Plugin', desc: 'Ganti status aktivitas Playing/Listening/Watching bot.', aliases: ['setstatus'] },
  { name: '!performance', slash: '/performance', cat: 'Plugin', desc: 'Pantau beban CPU, Heap RAM, dan Shard cluster bot.', aliases: ['perf'] },
  { name: '!syncslash', slash: '/syncslash', cat: 'Plugin', desc: 'Sinkronkan seluruh slash command ke API Discord secara global.', aliases: ['registerslash'] },
  { name: '!flushcache', slash: '/flushcache', cat: 'Plugin', desc: 'Bersihkan cache memori sementara untuk performa prima.', aliases: ['clearcache'] },
  { name: '!gitstatus', slash: '/gitstatus', cat: 'Plugin', desc: 'Cek commit Git terbaru dan status repositori.', aliases: ['git'] },
  { name: '!maintenance', slash: '/maintenance', cat: 'Plugin', desc: 'Aktifkan mode pemeliharaan bot.', aliases: ['mt'] },
  { name: '!restart', slash: '/restart', cat: 'Plugin', desc: 'Restart proses bot secara instan (PM2/Node).', aliases: ['reboot'] },
  { name: '!shutdown', slash: '/shutdown', cat: 'Plugin', desc: 'Matikan bot secara aman (Graceful Exit).', aliases: ['stopbot'] }
];

function initCommandExplorer() {
  const searchInput = document.getElementById('commandSearchInput');
  const chips = document.querySelectorAll('.category-chip');
  const grid = document.getElementById('commandsGrid');
  const countBadge = document.getElementById('commandsCountBadge');

  if (!searchInput || !grid) return;

  let currentCategory = 'all';

  function renderCommands() {
    const query = searchInput.value.toLowerCase().trim();

    const filtered = botCommands.filter(cmd => {
      const matchCat = (currentCategory === 'all') || (cmd.cat.toLowerCase() === currentCategory.toLowerCase());
      const matchQuery = !query || 
        cmd.name.toLowerCase().includes(query) || 
        cmd.slash.toLowerCase().includes(query) || 
        cmd.desc.toLowerCase().includes(query) ||
        cmd.aliases.some(a => a.toLowerCase().includes(query));
      return matchCat && matchQuery;
    });

    if (countBadge) countBadge.textContent = `${filtered.length} Perintah Ditemukan (Total: ${botCommands.length} Commands)`;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 12px; color: var(--mei-cyan);"></i>
          <p style="font-weight: 700; font-size: 1.1rem; color: #fff;">Tidak ada perintah yang cocok</p>
          <p style="font-size: 0.9rem;">Coba cari kata kunci lain seperti <code>setup</code>, <code>music</code>, <code>rank</code>, <code>hunt</code>, atau <code>ask</code>.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(cmd => `
      <div class="command-card" data-cmd="${cmd.name}">
        <div class="cmd-card-top">
          <span class="cmd-name-syntax">${cmd.name} <span style="color: var(--text-muted); font-size: 0.8em;">(${cmd.slash})</span></span>
          <span class="cmd-cat-tag">${cmd.cat}</span>
        </div>
        <div class="cmd-description">${cmd.desc}</div>
        <div class="cmd-card-bottom">
          <span class="cmd-aliases">Alias: ${cmd.aliases.map(a => `<code>${a}</code>`).join(', ')}</span>
          <button class="cmd-copy-btn" onclick="copyCommand('${cmd.name}')" title="Salin Perintah">
            <i class="far fa-copy"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  searchInput.addEventListener('input', renderCommands);

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.getAttribute('data-cat') || 'all';
      renderCommands();
    });
  });

  renderCommands();
}

window.copyCommand = function(cmd) {
  navigator.clipboard.writeText(cmd).then(() => {
    showToast(`✅ Perintah ${cmd} disalin ke clipboard!`);
  }).catch(() => {
    showToast(`✅ ${cmd}`);
  });
};

/* -----------------------------------------------------------------------------
 * 8. EMBED BUILDER WITH DISCORD PRESETS (Announcement, Rules, Partner, Giveaway, VIP)
 * -------------------------------------------------------------------------- */
const EMBED_PRESETS = {
  announcement: {
    author: '📢 Mei Labs • Official Announcement',
    title: '📢 PENGUMUMAN RESMI KOMUNITAS',
    desc: 'Halo semuanya! Ada informasi penting yang perlu diperhatikan oleh seluruh member server mengenai pembaruan fitur bot v1.2.0 dan event mingguan.',
    color: '#5865F2',
    footer: 'Official Server Announcement • Mei Labs'
  },
  rules: {
    author: '📜 Mei Security • Server Rules',
    title: '📜 PERATURAN RESMI SERVER',
    desc: 'Demi kenyamanan bersama, seluruh anggota wajib mematuhi ketentuan:\n1️⃣ Saling Menghormati tanpa SARA\n2️⃣ No Spam & Self-Promo\n3️⃣ Gunakan Channel Sesuai Topik\n4️⃣ Patuhi arahan moderator & laporkan tiket jika ada kendala',
    color: '#ED4245',
    footer: 'Server Rules & Guidelines • Terima kasih atas kerja samanya!'
  },
  partner: {
    author: '🤝 Mei Partnership Program',
    title: '🤝 PARTNERSHIP RESMI KOMUNITAS',
    desc: 'Kami dengan bangga mengumumkan kerja sama kemitraan bersama rekan komunitas baru! Silakan bergabung melalui tautan resmi kami.',
    color: '#F1C40F',
    footer: 'Server Partnership Program • Mei Labs'
  },
  giveaway: {
    author: '🎉 Mei Event Center',
    title: '🎉 SPECIAL GIVEAWAY & EVENT',
    desc: 'Ikuti event giveaway spesial member aktif server!\n🎁 **Hadiah:** Discord Nitro 1 Bulan & Role VIP Server 30 Hari\n📝 **Syarat:** Reaksi pada pesan ini & minimal Level 5 server!',
    color: '#9B59B6',
    footer: 'Good Luck Have Fun! 💫'
  },
  vip: {
    author: '💎 Mei Store & Benefits',
    title: '💎 STORE & BENEFIT VIP SERVER',
    desc: 'Dukung server kami dan dapatkan benefit:\n👑 Role & Warna Nama Khusus\n🔊 Bitrate Audio Voice Channel Tinggi (320kbps)\n📈 Bonus XP +50% di Leveling & Misi RPG',
    color: '#3498DB',
    footer: 'Terima kasih atas dukungan Anda untuk server ini!'
  }
};

function initEmbedBuilderWithPresets() {
  const presetBtns = document.querySelectorAll('.embed-preset-btn');
  const titleInput = document.getElementById('embedInputTitle');
  const descInput = document.getElementById('embedInputDesc');
  const colorInput = document.getElementById('embedInputColor');
  const authorInput = document.getElementById('embedInputAuthor');

  const previewCard = document.getElementById('discordEmbedCard');
  const previewAuthor = document.getElementById('previewEmbedAuthor');
  const previewTitle = document.getElementById('previewEmbedTitle');
  const previewDesc = document.getElementById('previewEmbedDesc');
  const previewFooter = document.getElementById('previewEmbedFooter');

  if (!titleInput || !previewCard) return;

  function updateEmbed() {
    if (previewTitle) previewTitle.textContent = titleInput.value || 'Mei Labs Announcement';
    if (previewDesc) previewDesc.innerHTML = (descInput.value || '').replace(/\n/g, '<br>');
    if (previewAuthor) previewAuthor.innerHTML = `<img src="assets/images/mei-avatar.jpg" style="width:20px;height:20px;border-radius:50%;"> <span>${authorInput.value || 'Mei Labs • Official Bot'}</span>`;
    if (previewCard) previewCard.style.borderLeftColor = colorInput.value || '#5865F2';
  }

  titleInput.addEventListener('input', updateEmbed);
  descInput.addEventListener('input', updateEmbed);
  colorInput.addEventListener('input', updateEmbed);
  authorInput.addEventListener('input', updateEmbed);

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const presetKey = btn.getAttribute('data-preset');
      const preset = EMBED_PRESETS[presetKey];
      if (preset) {
        authorInput.value = preset.author;
        titleInput.value = preset.title;
        descInput.value = preset.desc;
        colorInput.value = preset.color;
        if (previewFooter) previewFooter.innerHTML = `<span>${preset.footer}</span>`;
        updateEmbed();
        showToast(`📋 Preset embed '${presetKey}' dimuat!`);
      }
    });
  });
}

/* -----------------------------------------------------------------------------
 * 9. MASTER SERVER SETUP DASHBOARD SIMULATOR (!setup - 14 Categories)
 * -------------------------------------------------------------------------- */
const SETUP_CATEGORIES = {
  home: {
    title: '🏠 Beranda (Overview Status)',
    desc: 'Ringkasan channel routing dan status aktif seluruh fitur bot di server Anda.',
    items: [
      { icon: '🎣', name: 'Fishing Channel', status: '#mancing-mania' },
      { icon: '🏹', name: 'Hunting Channel', status: '#hutan-berburu' },
      { icon: '🌾', name: 'Farm Channel', status: '#kebun-komunitas' },
      { icon: '🤖', name: 'AI Dungeon RPG', status: '#dungeon-ai' },
      { icon: '⚖️', name: 'Market / Auction', status: '#pasar-lelang' },
      { icon: '🏆', name: 'Achievement Hub', status: '#prestasi-server' },
      { icon: '🔊', name: 'Temp Voice Generator', status: '🔊 Buat Voice (+)' },
      { icon: '🎵', name: 'Music Channel', status: '#request-lagu' },
      { icon: '🛡️', name: 'Moderation Log', status: '#mod-logs' },
      { icon: '👋', name: 'Welcome System', status: '✅ Aktif (#welcome)' },
      { icon: '✅', name: 'Verification Captcha', status: '✅ Math Captcha Aktif' },
      { icon: '🎮', name: 'Minecraft Realm', status: '✅ play.hyrost.net' }
    ]
  },
  features: {
    title: '⚙️ Saklar Fitur Modular (23 Fitur)',
    desc: 'Kelola fitur bot yang aktif atau nonaktif di server dengan saklar on/off individual.',
    items: [
      { icon: '🎣', name: 'Sistem Mancing', status: '🟢 Aktif' },
      { icon: '🏹', name: 'Sistem Berburu', status: '🟢 Aktif' },
      { icon: '🌾', name: 'Perkebunan Virtual', status: '🟢 Aktif' },
      { icon: '🏰', name: 'AI Dungeon Master', status: '🟢 Aktif' },
      { icon: '⚡', name: 'RPG Skill Tree', status: '🟢 Aktif' },
      { icon: '💰', name: 'Ekonomi & Kasino', status: '🟢 Aktif' },
      { icon: '⚖️', name: 'Pasar Lelang P2P', status: '🟢 Aktif' },
      { icon: '🎵', name: 'Lavalink Music HQ', status: '🟢 Aktif' }
    ]
  },
  rpg: {
    title: '🎣 RPG, Minigames & Adventure Setup',
    desc: 'Konfigurasi channel khusus untuk aktivitas RPG berhadiah Koin & XP di server.',
    items: [
      { icon: '🎣', name: 'Channel Mancing', status: 'Diset: #mancing' },
      { icon: '🏹', name: 'Channel Berburu', status: 'Diset: #berburu' },
      { icon: '🌾', name: 'Channel Perkebunan', status: 'Diset: #kebun' },
      { icon: '🤖', name: 'Channel AI Dungeon', status: 'Diset: #dungeon' },
      { icon: '⭐', name: 'RPG Skill Tree', status: 'Aktif Global (!skills)' }
    ]
  },
  market: {
    title: '⚖️ Market & Lelang Komunitas',
    desc: 'Pasar jual-beli P2P, lelang item langka, dan sistem bursa koin antar member.',
    items: [
      { icon: '⚖️', name: 'Market Channel', status: 'Diset: #pasar-komunitas' },
      { icon: '🏷️', name: 'Market Fee', status: '2% Pajak Transaksi' },
      { icon: '🔨', name: 'Durasi Lelang Max', status: '24 Jam' },
      { icon: '📜', name: 'Auto Log Transaksi', status: 'Aktif' }
    ]
  },
  voice_music: {
    title: '🔊 Voice & Music System Setup',
    desc: 'Atur generator temporary voice channel otomatis dan channel kendali musik 24/7.',
    items: [
      { icon: '🔊', name: 'Auto Temp Voice', status: 'Aktif: Buat Kamar Otomatis' },
      { icon: '🎵', name: 'Music Request Channel', status: '#music-player' },
      { icon: '🎚️', name: 'Default Volume', status: '80% (Bisa 0 - 200%)' },
      { icon: '🌐', name: 'Lavalink Cluster', status: '3 Node SSL Aktif' }
    ]
  },
  categories: {
    title: '📁 Category & Channel Routing',
    desc: 'Atur kategori Discord terpisah untuk mengelompokkan channel tiket, voice, dan log.',
    items: [
      { icon: '🎫', name: 'Kategori Tiket', status: '📁 PUSAT BANTUAN' },
      { icon: '🔊', name: 'Kategori Temp Voice', status: '📁 VOICE CHANNELS' },
      { icon: '📊', name: 'Kategori Server Stats', status: '📁 SERVER STATS' },
      { icon: '🛡️', name: 'Kategori Moderasi', status: '📁 ADMIN LOGS' }
    ]
  },
  welcome: {
    title: '👋 Welcome & Leave System',
    desc: 'Pesan penyambutan berformat kartu gambar/embed dan pesan perpisahan member.',
    items: [
      { icon: '👋', name: 'Welcome Channel', status: '#selamat-datang' },
      { icon: '🚪', name: 'Leave Channel', status: '#member-keluar' },
      { icon: '🖼️', name: 'Format Sambutan', status: 'Kartu Gambar Canvas + Embed' },
      { icon: '👑', name: 'Auto Role Member Baru', status: '@Member' }
    ]
  },
  community: {
    title: '📢 Community Channels',
    desc: 'Channel terpusat untuk pengumuman resmi, partnership, achievement, dan invite logs.',
    items: [
      { icon: '📢', name: 'Announcement Channel', status: '#pengumuman' },
      { icon: '🤝', name: 'Partner Channel', status: '#partnership' },
      { icon: '🏆', name: 'Achievement Feed', status: '#achievement' },
      { icon: '📨', name: 'Invite Tracker Log', status: '#invite-log' }
    ]
  },
  takerole: {
    title: '🎭 Take Role (Self-Roles)',
    desc: 'Panel ambil role mandiri menggunakan dropdown menu atau reaksi emoji.',
    items: [
      { icon: '🎭', name: 'Tipe Menu Role', status: 'Dropdown Menu Interaktif' },
      { icon: '🎨', name: 'Role Gender & Hobi', status: '4 Kategori Aktif' },
      { icon: '🔔', name: 'Role Notifikasi Event', status: '@Ping Event' },
      { icon: '📍', name: 'Channel Role Menu', status: '#ambil-role' }
    ]
  },
  moderation: {
    title: '🛡️ Moderation & Security Setup',
    desc: 'Konfigurasi audit log, anti-raid, dan proteksi spam otomatis.',
    items: [
      { icon: '📜', name: 'Mod Log Channel', status: '#audit-log' },
      { icon: '🛑', name: 'Anti-Raid Filter', status: 'Maks 10 join / menit' },
      { icon: '⚠️', name: 'Max Warnings', status: '3x Peringatan -> Auto Mute' },
      { icon: '🔒', name: 'Muted Role', status: '@Muted' }
    ]
  },
  utility: {
    title: '🛠️ Utility & Features Setup',
    desc: 'Atur channel sistem tiket, laporan pelanggaran, saran komunitas, dan AI chat.',
    items: [
      { icon: '🎫', name: 'Channel Tiket Support', status: '#bantuan-tiket' },
      { icon: '💡', name: 'Channel Saran Komunitas', status: '#saran-server' },
      { icon: '🚨', name: 'Channel Laporan Member', status: '#laporan-staf' },
      { icon: '🤖', name: 'Channel AI Auto-Chat', status: '#tanya-mei' }
    ]
  },
  minecraft: {
    title: '🎮 Minecraft & Stats Bridge',
    desc: 'Integrasi server Minecraft Hyrost Realm dan channel status pemain live.',
    items: [
      { icon: '🌐', name: 'IP Server', status: 'play.hyrost.net' },
      { icon: '🔌', name: 'Port Default', status: '25565 (Java & Bedrock)' },
      { icon: '🔄', name: 'Interval Auto Update', status: 'Setiap 5 Menit' },
      { icon: '🏷️', name: 'Channel Status Ping', status: '🟢 Online: 128 Pemain' }
    ]
  },
  verification: {
    title: '✅ Verification Settings',
    desc: 'Atur mekanisme captcha interaktif (Math / Emoji) untuk menyaring bot raid.',
    items: [
      { icon: '✅', name: 'Status Verifikasi', status: '🟢 Aktif' },
      { icon: '🧮', name: 'Tipe Captcha', status: 'Math Captcha (Acak)' },
      { icon: '👢', name: 'Kick on 3x Fail', status: '🟢 Aktif' },
      { icon: '🏷️', name: 'Verified Role', status: '@Verified Member' }
    ]
  },
  ui: {
    title: '🎨 UI & Embed Settings',
    desc: 'Kustomisasi warna embed default bot, gaya tombol menu, dan mode tampilan.',
    items: [
      { icon: '🎨', name: 'Warna Embed Server', status: '#5865F2 (Discord Indigo)' },
      { icon: '🔘', name: 'Gaya Tombol Menu', status: 'Primary (Modern Blue)' },
      { icon: '⚡', name: 'Seamless UI Mode', status: '🟢 Aktif' },
      { icon: '📝', name: 'Custom Footer Text', status: 'Mei Labs • Ketik !help' }
    ]
  }
};

function initSetupDashboardSimulator() {
  const select = document.getElementById('setupCategorySelect');
  const titleEl = document.getElementById('setupDashboardTitle');
  const descEl = document.getElementById('setupDashboardDesc');
  const gridEl = document.getElementById('setupDashboardGrid');

  if (!select || !gridEl) return;

  function renderSetupCategory(catKey) {
    const data = SETUP_CATEGORIES[catKey] || SETUP_CATEGORIES.home;
    if (titleEl) titleEl.textContent = data.title;
    if (descEl) descEl.textContent = data.desc;

    gridEl.innerHTML = data.items.map(item => `
      <div style="background: var(--bg-surface-2, #121827); border: 1px solid var(--border-subtle, rgba(255,255,255,0.07)); padding: 12px 14px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 0.88rem; color: #fff;">${item.icon} ${item.name}</span>
        <span style="font-size: 0.8rem; color: var(--mei-cyan, #06b6d4); font-weight: 700;">${item.status}</span>
      </div>
    `).join('');
  }

  select.addEventListener('change', () => {
    renderSetupCategory(select.value);
  });

  renderSetupCategory('home');
}

/* -----------------------------------------------------------------------------
 * 10. 23 MODULAR FEATURE SWITCHBOARD SIMULATOR (!features)
 * -------------------------------------------------------------------------- */
const MODULAR_FEATURES = [
  { key: 'fishing', name: 'Sistem Mancing', icon: '🎣', active: true },
  { key: 'hunting', name: 'Sistem Berburu', icon: '🏹', active: true },
  { key: 'farm', name: 'Perkebunan Virtual', icon: '🌾', active: true },
  { key: 'dungeon', name: 'AI Dungeon RPG', icon: '🏰', active: true },
  { key: 'skills', name: 'RPG Skill Tree', icon: '⚡', active: true },
  { key: 'economy', name: 'Ekonomi & Toko', icon: '💰', active: true },
  { key: 'auction', name: 'Pasar Lelang P2P', icon: '⚖️', active: true },
  { key: 'bounty', name: 'Sistem Buronan', icon: '🎯', active: true },
  { key: 'leveling', name: 'Leveling & XP Card', icon: '📈', active: true },
  { key: 'music', name: 'Lavalink Music HQ', icon: '🎵', active: true },
  { key: 'tempvoice', name: 'Temp-Voice Auto', icon: '🔊', active: true },
  { key: 'ticket', name: 'Tiket Bantuan', icon: '🎫', active: true },
  { key: 'verification', name: 'Verifikasi Captcha', icon: '✅', active: true },
  { key: 'aichannel', name: 'Gemini AI Auto-Chat', icon: '🤖', active: true },
  { key: 'welcome', name: 'Penyambutan Member', icon: '👋', active: true },
  { key: 'moderation', name: 'Alat Moderasi & Log', icon: '🛡️', active: true },
  { key: 'automod', name: 'Auto-Mod & Shield', icon: '🛑', active: true },
  { key: 'giveaway', name: 'Event Giveaway', icon: '🎉', active: true },
  { key: 'minecraft', name: 'Minecraft Realm Status', icon: '⛏️', active: true },
  { key: 'analytics', name: 'Statistik Server', icon: '📊', active: true },
  { key: 'invites', name: 'Pelacak Undangan', icon: '📨', active: true },
  { key: 'social', name: 'Pernikahan & Reputasi', icon: '💍', active: true },
  { key: 'minigames', name: 'Game & Mini-Trivia', icon: '🎲', active: true }
];

function initFeatureSwitchboardSimulator() {
  const container = document.getElementById('featureSwitchboardGrid');
  const activeCountEl = document.getElementById('switchboardActiveCount');
  if (!container) return;

  function renderSwitchboard() {
    const activeCount = MODULAR_FEATURES.filter(f => f.active).length;
    if (activeCountEl) {
      activeCountEl.textContent = `${activeCount} / ${MODULAR_FEATURES.length} Fitur Aktif`;
    }

    container.innerHTML = MODULAR_FEATURES.map((feat, idx) => `
      <div class="switchboard-card ${feat.active ? 'active' : 'inactive'}" onclick="toggleSwitchboardFeature(${idx})" role="button" tabindex="0" title="Klik untuk saklar on/off">
        <div class="switch-left-col">
          <span class="switch-icon">${feat.icon}</span>
          <span class="switch-label">${feat.name}</span>
        </div>
        <div class="switch-toggle-pill ${feat.active ? 'on' : 'off'}">
          <span class="switch-pill-dot"></span>
          <span class="switch-pill-text">${feat.active ? 'AKTIF' : 'NONAKTIF'}</span>
        </div>
      </div>
    `).join('');
  }

  window.toggleSwitchboardFeature = function(idx) {
    if (MODULAR_FEATURES[idx]) {
      MODULAR_FEATURES[idx].active = !MODULAR_FEATURES[idx].active;
      renderSwitchboard();
      const f = MODULAR_FEATURES[idx];
      showToast(`${f.icon} ${f.name} sekarang ${f.active ? 'diaktifkan' : 'dinonaktifkan'}!`);
    }
  };

  renderSwitchboard();
}

/* -----------------------------------------------------------------------------
 * 11. DISCORD INVITE MODAL
 * -------------------------------------------------------------------------- */
function initInviteModal() {
  const modalOverlay = document.getElementById('inviteModalOverlay');
  const openBtns = document.querySelectorAll('.open-invite-modal');
  const closeBtn = document.getElementById('closeInviteModal');
  const permItems = document.querySelectorAll('.perm-option-item');
  const generateBtn = document.getElementById('generateInviteBtn');
  const inviteLinkInput = document.getElementById('generatedInviteLink');

  if (!modalOverlay) return;

  const clientId = "723160545146044437"; // Mei Labs Client ID
  let currentPerm = "8"; // 8 = Administrator

  function updateInviteLink() {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${currentPerm}&scope=bot%20applications.commands`;
    if (inviteLinkInput) inviteLinkInput.value = url;
    if (generateBtn) generateBtn.href = url;
  }

  openBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      modalOverlay.classList.add('open');
      updateInviteLink();
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modalOverlay.classList.remove('open'));
  }

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('open');
  });

  permItems.forEach(item => {
    item.addEventListener('click', () => {
      permItems.forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      currentPerm = item.getAttribute('data-perm') || "8";
      updateInviteLink();
    });
  });
}

/* -----------------------------------------------------------------------------
 * 12. LIVE STATS TICKER & NODE MONITOR
 * -------------------------------------------------------------------------- */
function initLiveStatsTicker() {
  const pingEl = document.getElementById('liveBotPing');
  const memoryEl = document.getElementById('liveBotMemory');
  if (!pingEl || !memoryEl) return;

  setInterval(() => {
    const jitterPing = 16 + Math.floor(Math.random() * 7);
    pingEl.textContent = `${jitterPing}ms`;

    const jitterRam = (45.2 + (Math.random() * 2 - 1)).toFixed(1);
    memoryEl.textContent = `${jitterRam} MB`;
  }, 4000);
}

/* -----------------------------------------------------------------------------
 * 13. TOAST NOTIFICATION UTILITY
 * -------------------------------------------------------------------------- */
function showToast(msg) {
  let toast = document.getElementById('botToastNotice');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'botToastNotice';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<i class="fas fa-info-circle" style="color: var(--mei-cyan, #06b6d4)"></i> <span>${msg}</span>`;
  toast.classList.add('show');

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

/* -----------------------------------------------------------------------------
 * 14. DYNAMIC BOT VERSION AUTO-SYNC (Synchronize with Mei Labs Bot Core Engine)
 * -------------------------------------------------------------------------- */
async function initAutoVersionSync() {
  let botData = null;

  // 1. Try fetching from dynamic backend API endpoint
  try {
    const res = await fetch('/api/bot/info');
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && (json.displayVersion || json.version)) {
        botData = json;
      }
    }
  } catch {}

  // 2. Fallback to static data/bot-info.json if API is unavailable
  if (!botData) {
    try {
      const res = await fetch('data/bot-info.json');
      if (res.ok) {
        botData = await res.json();
      }
    } catch {}
  }

  if (botData) {
    const vStr = botData.displayVersion || (botData.version ? (botData.version.startsWith('v') ? botData.version : `v${botData.version}`) : 'v2.54.5');
    const prefixStr = botData.prefix || '!';

    // Update all version tags on the page
    document.querySelectorAll('.bot-version-text').forEach(el => {
      el.textContent = vStr;
    });

    // Update prefix tags
    document.querySelectorAll('.bot-prefix-text').forEach(el => {
      el.textContent = prefixStr;
    });

    // Update embed builder default description if version matches
    const embedDescInput = document.getElementById('embedInputDesc');
    const previewDesc = document.getElementById('previewEmbedDesc');
    if (embedDescInput && /v[0-9]+\.[0-9]+\.[0-9]+/i.test(embedDescInput.value)) {
      embedDescInput.value = embedDescInput.value.replace(/v[0-9]+\.[0-9]+\.[0-9]+/g, vStr);
      if (previewDesc) {
        previewDesc.innerHTML = embedDescInput.value.replace(/\n/g, '<br>');
      }
    }
  }
}

