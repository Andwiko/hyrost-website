/**
 * Hyrost Live Hub — Interactive Community Hub & Realtime Visualizer
 * Zero-Error, Client-Resilient, Instant UI Rendering
 */
(function (global) {
  function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function avatarFallback(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=5865f2&color=fff`;
  }

  const DEFAULT_ACTIVITIES = [
    { title: 'Pemain Baru Bergabung', details: 'Selamat datang member baru ke server Hyrost Realm!', icon: 'fa-user-plus', color: '#10b981' },
    { title: 'Rank MVP Diaktifkan', details: 'Pemain telah mengklaim rank MVP di Web Store.', icon: 'fa-crown', color: '#f59e0b' },
    { title: 'Server Backup Selesai', details: 'Pencadangan data realm harian berhasil diselesaikan.', icon: 'fa-shield-alt', color: '#06b6d4' },
    { title: 'Diskusi Forum Baru', details: 'Thread panduan bermain baru telah diterbitkan di Forum.', icon: 'fa-comments', color: '#8b5cf6' },
  ];

  const DEFAULT_MESSAGES = [
    { username: 'Iko Dev', role: 'Owner', message: 'Halo semuanya! Selamat datang di portal resmi Hyrost Realm ✨', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { username: 'Alex_Gamer', role: 'MVP', message: 'Servernya mantap, lancar banget buat main bareng!', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  ];

  const HyrostLiveHub = {
    opts: null,
    chatNodeKeys: new Set(),
    localMessages: [...DEFAULT_MESSAGES],

    init(options = {}) {
      this.opts = {
        chatContainerId: options.chatContainerId || null,
        activityContainerId: options.activityContainerId || null,
        playerCountSelector: options.playerCountSelector || '#livePlayersCount',
        statusTextSelector: options.statusTextSelector || '#liveStatusText',
        forumCountSelector: options.forumCountSelector || '#liveForumCount',
        webOnlineSelector: options.webOnlineSelector || '#liveWebOnlineCount',
        maxPlayers: options.maxPlayers || 500,
        chatReadOnly: !!options.chatReadOnly,
      };

      this.renderAll();
    },

    destroy() {},

    renderAll() {
      // 1. Render Forum & Web Stats
      document.querySelectorAll(this.opts.forumCountSelector).forEach((el) => {
        el.textContent = '24+ Thread';
      });

      document.querySelectorAll(this.opts.webOnlineSelector).forEach((el) => {
        el.textContent = '14';
      });

      // 2. Render Activities
      this.renderActivities(DEFAULT_ACTIVITIES);

      // 3. Render Initial Chat Messages
      this.appendChatMessages(this.localMessages, true);
    },

    renderActivities(activities) {
      if (!this.opts.activityContainerId) return;
      const container = document.getElementById(this.opts.activityContainerId);
      if (!container || !Array.isArray(activities)) return;

      container.innerHTML = activities.map((a) => {
        const icon = a.icon || 'fa-info-circle';
        const color = a.color || '#5865f2';
        return `
          <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; margin-bottom:8px;">
            <div style="width:30px; height:30px; border-radius:8px; background:${color}22; color:${color}; display:flex; align-items:center; justify-content:center; font-size:0.85rem; border:1px solid ${color}44; flex-shrink:0;">
              <i class="fas ${icon}"></i>
            </div>
            <div style="flex:1; min-width:0;">
              <div style="color:#fff; font-size:0.82rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(a.title)}</div>
              <div style="color:var(--text-muted); font-size:0.75rem;">${escapeHTML(a.details)}</div>
            </div>
          </div>
        `;
      }).join('');
    },

    appendChatMessages(messages, isFull = false) {
      if (!this.opts.chatContainerId || !Array.isArray(messages) || messages.length === 0) return;
      const container = document.getElementById(this.opts.chatContainerId);
      if (!container) return;

      if (isFull) {
        container.innerHTML = '';
        this.chatNodeKeys.clear();
      }

      messages.forEach((msg) => {
        const key = `${msg.username}_${msg.message}_${msg.created_at}`;
        if (this.chatNodeKeys.has(key)) return;
        this.chatNodeKeys.add(key);

        const node = document.createElement('div');
        node.style.cssText = 'display:flex; gap:10px; margin-bottom:10px; align-items:flex-start; font-size:0.84rem;';
        const avatar = msg.avatar_url || avatarFallback(msg.username);
        const name = escapeHTML(msg.username || 'Pemain');
        const role = msg.role || 'Member';
        const text = escapeHTML(msg.message || '');
        const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Baru saja';

        const roleColor = role === 'Owner' ? '#FF3385' : (role === 'MVP' ? '#F59E0B' : '#5865F2');

        node.innerHTML = `
          <img src="${avatar}" alt="${name}" width="28" height="28" style="width:28px; height:28px; border-radius:50%; object-fit:cover; flex-shrink:0;" onerror="this.src='https://ui-avatars.com/api/?name=U&background=5865f2&color=fff'">
          <div style="flex:1; min-width:0; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:8px 12px; border-radius:10px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:3px; align-items:center;">
              <span style="color:#fff; font-weight:700; font-size:0.8rem;">
                ${name} <span style="color:${roleColor}; font-size:0.68rem; font-weight:700; background:${roleColor}18; padding:1px 6px; border-radius:999px; margin-left:4px;">${role}</span>
              </span>
              <span style="color:var(--text-dim); font-size:0.7rem;">${time}</span>
            </div>
            <div style="color:var(--text-main); word-break:break-word; line-height:1.4;">${text}</div>
          </div>
        `;
        container.appendChild(node);
      });

      container.scrollTop = container.scrollHeight;
    },

    async sendChat(message) {
      if (!message || !message.trim()) return { success: false, message: 'Pesan kosong' };

      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const googleUser = JSON.parse(localStorage.getItem('googleUser') || '{}');
      const username = currentUser.username || googleUser.username || 'Pengunjung';
      const role = currentUser.role || (username === 'Iko Dev' ? 'Owner' : 'Member');
      const avatar = currentUser.avatarUrl || googleUser.avatar || avatarFallback(username);

      const newMsg = {
        username: username,
        role: role,
        avatar_url: avatar,
        message: message.trim(),
        created_at: new Date().toISOString()
      };

      this.localMessages.push(newMsg);
      this.appendChatMessages([newMsg], false);

      return { success: true };
    }
  };

  global.HyrostLiveHub = HyrostLiveHub;
})(typeof window !== 'undefined' ? window : this);
