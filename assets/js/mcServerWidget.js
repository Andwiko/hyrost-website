/**
 * Hyrost — Realtime Minecraft server status widget (website ↔ MC server).
 * Polls /api/server-status (plugin bridge + mcsrvstat) and updates all IP widgets.
 */
(function (global) {
  const POLL_MS = 10000;

  const HyrostMCServer = {
    data: null,
    timer: null,

    init() {
      if (this.timer) return;
      this.refresh();
      this.timer = setInterval(() => this.refresh(), POLL_MS);
    },

    destroy() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    },

    async refresh() {
      try {
        const res = await fetch('/api/server-status', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        this.apply(data);
      } catch (_) {}
    },

    apply(data) {
      if (!data) return;
      this.data = data;

      const ip = data.serverIp || 'play.hyrost.net';
      const port = data.serverPort || '25565';
      const address = data.serverAddress || (port && port !== '25565' ? `${ip}:${port}` : ip);
      const online = !!data.isOnline;
      const players = data.onlinePlayers ?? 0;
      const max = data.maxPlayers || 500;
      const source = data.statusSource || 'api';

      // All IP text nodes across the site
      document.querySelectorAll(
        '.server-ip, .server-pill-ip, #ipText, #sidebarServerIp, #serverIpDisplay, #realmServerIp, #mcServerWidgetIp, [data-mc-server-ip]'
      ).forEach((el) => {
        el.textContent = el.dataset.mcShowPort === 'true' ? address : ip;
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
        if (el.dataset.format === 'full') {
          el.textContent = `${players} / ${max}`;
        } else {
          el.textContent = String(players);
        }
      });

      document.querySelectorAll('#livePlayersCount, [data-mc-player-count-fraction]').forEach((el) => {
        el.textContent = `${players} / ${max}`;
      });

      // Status dots
      document.querySelectorAll('.status-dot, .mc-sync-dot').forEach((dot) => {
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
      if (updatedEl && data.lastUpdated) {
        const t = new Date(data.lastUpdated);
        const srcLabel = source === 'plugin' ? 'Plugin' : source === 'mcsrvstat' ? 'Query' : 'API';
        updatedEl.textContent = `Diperbarui ${t.toLocaleTimeString('id-ID')} · ${srcLabel}`;
      }

      const widget = document.getElementById('mcServerWidget');
      if (widget) {
        widget.classList.toggle('mc-server-online', online);
        widget.classList.toggle('mc-server-offline', !online);
      }

      // Store for copy helpers
      global.__hyrostServerIp = ip;
      global.__hyrostServerAddress = address;
    },

    copyIp() {
      const text = this.data?.serverAddress || global.__hyrostServerAddress
        || (() => {
          const ip = this.data?.serverIp || global.__hyrostServerIp || 'play.hyrost.net';
          const port = this.data?.serverPort || '25565';
          return port && port !== '25565' ? `${ip}:${port}` : ip;
        })();

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          HyrostMCServer.showCopyToast(`IP ${text} disalin!`);
        }).catch(() => {
          HyrostMCServer.fallbackCopy(text);
        });
      } else {
        this.fallbackCopy(text);
      }
    },

    fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        this.showCopyToast(`IP ${text} disalin!`);
      } catch (_) {
        alert('IP: ' + text);
      }
      document.body.removeChild(ta);
    },

    showCopyToast(msg) {
      if (typeof toast === 'function') {
        toast(msg, 'success');
        return;
      }
      const existing = document.getElementById('mcCopyToast');
      if (existing) existing.remove();
      const el = document.createElement('div');
      el.id = 'mcCopyToast';
      el.textContent = msg;
      el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:10px 18px;border-radius:10px;font-weight:700;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.4);';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    },
  };

  global.HyrostMCServer = HyrostMCServer;
  global.copyIP = () => HyrostMCServer.copyIp();
  global.copyServerIP = () => HyrostMCServer.copyIp();

  document.addEventListener('DOMContentLoaded', () => HyrostMCServer.init());
})(window);
