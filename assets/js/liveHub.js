/**
 * Hyrost Live Hub — realtime server status, community chat, activity feed, web presence.
 */
(function (global) {
  const DEFAULT_INTERVALS = {
    snapshot: 12000,
    presence: 20000,
  };

  function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getVisitorId() {
    let id = localStorage.getItem('hyrost_visitor_id');
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('hyrost_visitor_id', id);
    }
    return id;
  }

  function avatarFallback(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=6366f1&color=fff`;
  }

  const HyrostLiveHub = {
    opts: null,
    lastChatId: 0,
    eventSource: null,
    timers: [],
    chatNodeKeys: new Set(),

    init(options = {}) {
      this.opts = {
        chatContainerId: options.chatContainerId || null,
        activityContainerId: options.activityContainerId || null,
        playersContainerId: options.playersContainerId || null,
        serverIpSelector: options.serverIpSelector || '#ipText, .server-ip, #sidebarServerIp',
        playerCountSelector: options.playerCountSelector || '#livePlayersCount, #sidebarOnlinePlayers, #onlinePlayers',
        statusTextSelector: options.statusTextSelector || '#liveStatusText',
        statusDotSelector: options.statusDotSelector || '.status-dot, .badge-dot',
        forumCountSelector: options.forumCountSelector || '#liveForumCount',
        webOnlineSelector: options.webOnlineSelector || '#liveWebOnlineCount',
        maxPlayers: options.maxPlayers || 500,
        chatReadOnly: !!options.chatReadOnly,
        onChatMessage: typeof options.onChatMessage === 'function' ? options.onChatMessage : null,
        intervals: { ...DEFAULT_INTERVALS, ...(options.intervals || {}) },
      };

      this.lastChatId = 0;
      this.chatNodeKeys.clear();

      this.refreshSnapshot(true);
      this.connectStream();
      this.timers.push(setInterval(() => this.refreshSnapshot(false), this.opts.intervals.snapshot));
      this.timers.push(setInterval(() => this.sendPresence(), this.opts.intervals.presence));
      this.sendPresence();
    },

    destroy() {
      this.timers.forEach(clearInterval);
      this.timers = [];
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    },

    connectStream() {
      if (typeof EventSource === 'undefined') return;
      if (this.eventSource) this.eventSource.close();

      try {
        this.eventSource = new EventSource('/api/live-hub/stream');
        this.eventSource.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data.type === 'chat' && data.message) {
              this.appendChatMessages([data.message], true);
            }
          } catch (_) {}
        };
        this.eventSource.onerror = () => {
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
          setTimeout(() => this.connectStream(), 5000);
        };
      } catch (_) {}
    },

    async sendPresence() {
      try {
        await fetch('/api/live-hub/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId: getVisitorId() }),
        });
      } catch (_) {}
    },

    async refreshSnapshot(full = false) {
      try {
        const since = full ? 0 : this.lastChatId;
        const url = `/api/live-hub/snapshot?sinceChat=${since}&visitorId=${encodeURIComponent(getVisitorId())}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success) return;

        if (data.server) this.renderServer(data.server);
        if (data.activities) this.renderActivities(data.activities);
        if (data.chatMessages) this.appendChatMessages(data.chatMessages, full);
        if (data.lastChatId) this.lastChatId = Math.max(this.lastChatId, data.lastChatId);
        if (data.forumStats) this.renderForumStats(data.forumStats);
        if (typeof data.webOnline === 'number') this.renderWebOnline(data.webOnline);
      } catch (_) {}
    },

    renderServer(server) {
      const ip = server.serverIp || 'play.hyrost.net';
      document.querySelectorAll(this.opts.serverIpSelector).forEach((el) => {
        el.textContent = ip;
      });

      const online = server.onlinePlayers ?? 0;
      const max = this.opts.maxPlayers;
      document.querySelectorAll(this.opts.playerCountSelector).forEach((el) => {
        if (el.id === 'livePlayersCount' || el.dataset?.format === 'fraction') {
          el.textContent = `${online} / ${max}`;
        } else {
          el.textContent = String(online);
        }
      });

      document.querySelectorAll(this.opts.statusTextSelector).forEach((el) => {
        el.textContent = server.isOnline ? 'ONLINE' : 'OFFLINE';
        el.style.color = server.isOnline ? '#10b981' : '#ef4444';
      });

      document.querySelectorAll(this.opts.statusDotSelector).forEach((el) => {
        if (server.isOnline) {
          el.classList.add('online');
          el.style.background = '#10b981';
        } else {
          el.classList.remove('online');
          el.style.background = '#ef4444';
        }
      });

      if (this.opts.playersContainerId && server.playerList) {
        this.renderPlayers(server.playerList);
      }

      if (global.HyrostMCServer) {
        global.HyrostMCServer.apply(server);
      }
    },

    renderPlayers(playerList) {
      const container = document.getElementById(this.opts.playersContainerId);
      if (!container) return;

      if (!playerList.length) {
        container.innerHTML = '<span style="color:var(--text-dim); font-size:0.85rem;">Tidak ada pemain online saat ini.</span>';
        return;
      }

      container.innerHTML = playerList
        .map(
          (p) => `
        <div style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.05); padding:4px 10px; border-radius:20px; border:1px solid rgba(255,255,255,0.1);">
          <img src="${escapeHTML(p.avatar)}" alt="" style="width:20px; height:20px; border-radius:4px;" onerror="this.src='https://mc-heads.net/avatar/Steve/20'" />
          <span style="font-size:0.8rem; font-weight:600; color:#fff;">${escapeHTML(p.username)}</span>
        </div>`
        )
        .join('');
    },

    renderActivities(activities) {
      const container = document.getElementById(this.opts.activityContainerId);
      if (!container) return;

      if (!activities.length) {
        container.innerHTML = '<p style="color:#9ca3af; font-size:0.85rem; margin:0;">Belum ada aktivitas komunitas.</p>';
        return;
      }

      container.innerHTML = activities
        .map(
          (a) => `
        <div class="live-activity-item">
          <div class="live-activity-icon" style="background:${a.color}22; color:${a.color}; border-color:${a.color}44;">
            <i class="fas ${a.icon || 'fa-star'}"></i>
          </div>
          <div class="live-activity-body">
            <strong>${escapeHTML(a.title)}</strong>
            <span>${escapeHTML(a.details || '')}</span>
          </div>
        </div>`
        )
        .join('');
    },

    appendChatMessages(messages, replaceAll) {
      const container = document.getElementById(this.opts.chatContainerId);
      if (!container || !messages?.length) {
        if (replaceAll && container) {
          container.innerHTML = '<span style="color:var(--text-dim); font-size:0.85rem;">Belum ada pesan. Mulai obrolan sekarang!</span>';
        }
        return;
      }

      if (replaceAll) {
        container.innerHTML = '';
        this.chatNodeKeys.clear();
      }

      messages.forEach((m) => {
        const key = `chat-${m.id}`;
        if (this.chatNodeKeys.has(key)) return;
        this.chatNodeKeys.add(key);

        const row = document.createElement('div');
        row.className = 'live-chat-row';
        row.dataset.chatId = m.id;
        row.innerHTML = `
          <img src="${escapeHTML(m.avatar_url || avatarFallback(m.username))}" alt="" />
          <div>
            <strong>${escapeHTML(m.username)}:</strong>
            <span>${escapeHTML(m.message)}</span>
          </div>`;
        container.appendChild(row);
        this.lastChatId = Math.max(this.lastChatId, m.id);
      });

      container.scrollTop = container.scrollHeight;
    },

    renderForumStats(stats) {
      document.querySelectorAll(this.opts.forumCountSelector).forEach((el) => {
        el.textContent = `${stats.threadCount || 0}+`;
      });
    },

    renderWebOnline(count) {
      document.querySelectorAll(this.opts.webOnlineSelector).forEach((el) => {
        el.textContent = String(count);
      });
    },

    async sendChat(message) {
      const token = localStorage.getItem('hyrostToken');
      if (!token) {
        return { success: false, message: 'Silakan login untuk mengirim pesan.' };
      }

      const res = await fetch('/api/live-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (res.ok && data.chat) {
        this.appendChatMessages([data.chat], false);
        if (data.lastChatId) this.lastChatId = data.lastChatId;
      }
      return data;
    },
  };

  global.HyrostLiveHub = HyrostLiveHub;
  global.escapeHTML = escapeHTML;
})(typeof window !== 'undefined' ? window : global);
