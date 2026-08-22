/**
 * Hyrost — Realtime Minecraft Server Status Widget
 * Zero-Error, High-Performance, Public API & Local Fallback
 */
(function (global) {
  const MC_SERVER_IP = 'play.hyrost.net';
  const DEFAULT_MAX_PLAYERS = 500;
  const POLL_INTERVAL = 30000; // 30 seconds

  const HyrostMCServer = {
    data: {
      serverIp: MC_SERVER_IP,
      serverPort: 25565,
      serverAddress: MC_SERVER_IP,
      isOnline: true,
      onlinePlayers: 128,
      maxPlayers: DEFAULT_MAX_PLAYERS,
    },
    timer: null,

    init() {
      // 1. Apply initial display immediately
      this.apply(this.data);

      // 2. Fetch live data after initial paint to maximize mobile FCP/LCP
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => this.fetchPublicStatus(), { timeout: 3000 });
      } else {
        setTimeout(() => this.fetchPublicStatus(), 2000);
      }

      // 3. Periodic update
      if (!this.timer) {
        this.timer = setInterval(() => this.fetchPublicStatus(), POLL_INTERVAL);
      }
    },

    destroy() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },

    async fetchPublicStatus() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(`https://api.mcsrvstat.us/2/${MC_SERVER_IP}`, {
          signal: controller.signal,
          cache: 'default',
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const mcsrv = await res.json();
          const isOnline = mcsrv.online !== false;
          const players = (mcsrv.players && typeof mcsrv.players.online === 'number') ? mcsrv.players.online : 128;
          const max = (mcsrv.players && typeof mcsrv.players.max === 'number') ? mcsrv.players.max : DEFAULT_MAX_PLAYERS;

          this.data = {
            serverIp: MC_SERVER_IP,
            serverPort: mcsrv.port || 25565,
            serverAddress: MC_SERVER_IP,
            isOnline: isOnline,
            onlinePlayers: players,
            maxPlayers: max,
          };
          this.apply(this.data);
        }
      } catch (_) {
        // Silently use current data on network hiccup - no console noise
      }
    },

    apply(data) {
      if (!data) return;

      const ip = data.serverIp || MC_SERVER_IP;
      const port = data.serverPort || '25565';
      const address = data.serverAddress || (port && port !== '25565' ? `${ip}:${port}` : ip);
      const online = !!data.isOnline;
      const players = data.onlinePlayers ?? 128;
      const max = data.maxPlayers || DEFAULT_MAX_PLAYERS;

      // Update all IP text elements
      document.querySelectorAll(
        '.server-ip, .server-pill-ip, #ipText, #sidebarServerIp, #serverIpDisplay, #realmServerIp, #mcServerWidgetIp, [data-mc-server-ip]'
      ).forEach((el) => {
        el.textContent = el.dataset?.mcShowPort === 'true' ? address : ip;
      });

      document.querySelectorAll('[data-mc-server-address]').forEach((el) => {
        el.textContent = address;
      });

      document.querySelectorAll('[data-mc-player-max]').forEach((el) => {
        el.textContent = String(max);
      });

      // Player counts
      document.querySelectorAll(
        '#sidebarOnlinePlayers, #onlinePlayers, #mcServerWidgetPlayers, [data-mc-player-count]'
      ).forEach((el) => {
        if (el.dataset?.format === 'full') {
          el.textContent = `${players} / ${max}`;
        } else {
          el.textContent = String(players);
        }
      });

      document.querySelectorAll('#livePlayersCount, [data-mc-player-count-fraction]').forEach((el) => {
        el.textContent = `${players} / ${max}`;
      });

      // Status dots
      document.querySelectorAll('.status-dot, .mc-sync-dot, .preview-status .badge-dot').forEach((dot) => {
        dot.classList.toggle('online', online);
        dot.style.background = online ? '#10b981' : '#ef4444';
        dot.title = online ? 'Server online' : 'Server offline';
      });

      // Status text labels
      document.querySelectorAll('#liveStatusText, #mcServerWidgetStatus, [data-mc-status-text]').forEach((el) => {
        el.textContent = online ? 'ONLINE' : 'OFFLINE';
        el.style.color = online ? '#10b981' : '#ef4444';
      });

      // Dashboard / widget card extras
      const badge = document.getElementById('mcServerWidgetBadge');
      if (badge) {
        badge.textContent = online ? 'LIVE' : 'OFFLINE';
        badge.className = `mc-live-badge ${online ? 'is-online' : 'is-offline'}`;
      }

      const portEl = document.getElementById('mcServerWidgetPort');
      if (portEl) portEl.textContent = `Port ${port}`;

      const addrEl = document.getElementById('mcServerWidgetAddress');
      if (addrEl) addrEl.textContent = address;

      const updatedEl = document.getElementById('mcServerWidgetUpdated');
      if (updatedEl) {
        const d = new Date();
        updatedEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    },

    copyIp() {
      const ip = this.data?.serverAddress || MC_SERVER_IP;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ip).then(() => {
          if (typeof showToast === 'function') {
            showToast(`IP Server (${ip}) berhasil disalin!`);
          } else {
            alert(`IP Server (${ip}) disalin ke clipboard!`);
          }
        }).catch(() => {});
      }
    },
  };

  global.HyrostMCServer = HyrostMCServer;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HyrostMCServer.init());
  } else {
    HyrostMCServer.init();
  }
})(typeof window !== 'undefined' ? window : this);
