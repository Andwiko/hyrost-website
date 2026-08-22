// ═══════════════════════════════════════════════════════════════
// FORUM-THREAD.JS — Thread Detail Page Controller (v1)
// ═══════════════════════════════════════════════════════════════

const API_URL = '/api';

let currentUser   = null;
let threadId      = null;
let threadData    = null;
let replyImageB64 = null;

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    threadId = params.get('id');
    if (!threadId) {
        window.location.href = 'forum.html';
        return;
    }

    currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

    // Mobile sidebar
    const toggle  = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (toggle && sidebar && overlay) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // Admin nav
    const isAdmin = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'admin');
    if (isAdmin) {
        document.body.classList.add('is-admin');
    }
    document.querySelectorAll('.nav-admin, .nav-section-admin').forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
    });

    loadThread();
    setupReplyForm();
    setupRichEditor('.reply-toolbar', 'replyContent');
    setupReplyForm();
});

// ─── LOAD THREAD ──────────────────────────────────────────────────────────────
async function loadThread() {
    try {
        const res  = await fetch(`${API_URL}/forum/thread/${threadId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Not found');

        threadData = data;
        renderThread(data.thread);
        renderReplies(data.replies);
        setupReplyAccess();
    } catch (err) {
        console.error(err);
        document.getElementById('threadDetailTitle').textContent = 'Thread tidak ditemukan.';
        document.getElementById('threadBody').innerHTML = `<p style="color:#ef4444;">Gagal memuat thread: ${err.message}</p>`;
    }
}

function renderThread(thread) {
    const isAdmin = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'admin');
    const isOwner = currentUser && thread.user_id === currentUser.id;
    const avatar  = thread.avatar_url || `https://cravatar.eu/helmavatar/${encodeURIComponent(thread.username || 'Steve')}/64.png`;

    // Breadcrumb
    const breadCat = document.getElementById('breadcrumbCategory');
    const breadTitle = document.getElementById('breadcrumbTitle');
    if (breadCat)  breadCat.textContent = thread.category || 'General';
    if (breadTitle) breadTitle.textContent = thread.title.length > 40 ? thread.title.substring(0, 40) + '...' : thread.title;

    // Category pill
    const catPill = document.getElementById('threadCategoryPill');
    if (catPill) {
        const catColors = {
            General: '#6366f1', Announcement: '#ef4444', Guides: '#10b981',
            Economy: '#f59e0b', 'Game-Updates': '#06b6d4', 'VIP-Lounge': '#ffd700',
            Report: '#ef4444', Minecraft: '#84cc16'
        };
        const color = catColors[thread.category] || '#6366f1';
        catPill.textContent = thread.category || 'General';
        catPill.style.cssText = `background:${color}22; color:${color}; border:1px solid ${color}44;`;
    }

    // Pinned badge
    if (thread.is_pinned) {
        const pinBadge = document.getElementById('threadPinnedBadge');
        if (pinBadge) pinBadge.style.display = 'inline-flex';
    }

    // Title
    document.getElementById('threadDetailTitle').textContent = thread.title;
    document.title = `${thread.title} — Hyrost Forum`;

    // Tags
    if (thread.tags) {
        const tagsWrap = document.getElementById('threadTagsWrap');
        if (tagsWrap) {
            tagsWrap.style.display = 'flex';
            tagsWrap.innerHTML = thread.tags.split(',').filter(Boolean)
                .map(t => `<span class="thread-tag-pill">#${t.trim()}</span>`).join('');
        }
    }

    // Author row
    document.getElementById('threadAuthorAvatar').src = avatar;
    document.getElementById('threadAuthorName').textContent = thread.username || 'Anonim';
    document.getElementById('threadViews').textContent = thread.views || 0;
    document.getElementById('threadDate').textContent = `Ditulis ${new Date(thread.created_at).toLocaleString('id-ID')}`;

    if (thread.badge_text) {
        const badge = document.getElementById('threadAuthorBadge');
        if (badge) {
            badge.textContent = thread.badge_text;
            badge.style.cssText = `background:${thread.badge_color || '#888'}; color:white; padding:2px 8px; border-radius:4px; font-size:0.7rem; font-weight:700;`;
        }
    }

    // Body (render markdown)
    const body = document.getElementById('threadBody');
    if (body) body.innerHTML = renderMarkdown(thread.content);

    // Image
    if (thread.image_url) {
        const imgWrap = document.getElementById('threadImageWrap');
        const img     = document.getElementById('threadDetailImage');
        if (imgWrap && img) {
            imgWrap.style.display = 'block';
            img.src = thread.image_url;
        }
    }

    // Vote
    document.getElementById('voteScore').textContent = thread.vote_score || 0;

    // Reply count
    const replyCount = threadData ? threadData.replies.length : 0;
    document.getElementById('replyCount').textContent = replyCount;
    document.getElementById('replyCountLabel').textContent = `${replyCount} balasan`;

    // Sidebar Info
    document.getElementById('sidebarViews').textContent    = thread.views || 0;
    document.getElementById('sidebarVotes').textContent    = thread.vote_score || 0;
    document.getElementById('sidebarDate').textContent     = new Date(thread.created_at).toLocaleDateString('id-ID');
    document.getElementById('sidebarCategory').textContent = thread.category || 'General';

    // Author card
    document.getElementById('authorCardAvatar').src         = avatar;
    document.getElementById('authorCardName').textContent   = thread.username || '—';
    if (thread.badge_text) {
        const ab = document.getElementById('authorCardBadge');
        ab.textContent  = thread.badge_text;
        ab.style.cssText= `background:${thread.badge_color || '#888'}; color:white; padding:2px 10px; border-radius:6px; font-size:0.75rem; font-weight:700;`;
    }

    // Admin/Owner actions
    const actionsDiv = document.getElementById('threadDetailActions');
    if (actionsDiv) {
        let html = '';
        if (isOwner) html += `<button class="thread-action-btn btn-edit-thread" onclick="window.location.href='forum.html'" title="Edit"><i class="fas fa-edit"></i></button>`;
        if (isAdmin)  html += `
            <button class="thread-action-btn btn-pin" onclick="pinThread()" title="${thread.is_pinned ? 'Unpin' : 'Pin'}"><i class="fas fa-thumbtack"></i></button>
            <button class="thread-action-btn btn-delete-thread" onclick="deleteThread()" title="Hapus"><i class="fas fa-trash"></i></button>`;
        actionsDiv.innerHTML = html;
    }
}

function renderReplies(replies) {
    const list = document.getElementById('repliesList');
    if (!list) return;
    list.innerHTML = '';

    document.getElementById('sidebarReplies').textContent  = replies.length;
    document.getElementById('replyCount').textContent      = replies.length;
    document.getElementById('replyCountLabel').textContent = `${replies.length} balasan`;

    if (replies.length === 0) {
        list.innerHTML = `
            <div class="forum-empty-state" style="margin:20px 0; padding:30px;">
                <i class="fas fa-comment-slash"></i>
                <p>Belum ada balasan. Jadilah yang pertama menjawab!</p>
            </div>`;
        return;
    }

    const isAdmin = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'admin');

    replies.forEach((reply, idx) => {
        const avatar   = reply.avatar_url || `https://cravatar.eu/helmavatar/${encodeURIComponent(reply.username || 'Steve')}/64.png`;
        const badgeHtml = reply.badge_text
            ? `<span class="author-role-badge" style="background:${reply.badge_color || '#888'};">${reply.badge_text}</span>`
            : '';
        const isOwner  = currentUser && reply.user_id === currentUser.id;
        const deleteBtn = (isOwner || isAdmin)
            ? `<button class="btn-reply-delete" onclick="deleteReply(${reply.id})" title="Hapus balasan"><i class="fas fa-trash"></i></button>`
            : '';
        const imageHtml = reply.image_url
            ? `<div class="reply-image-wrap"><img src="${reply.image_url}" class="reply-image" alt="reply image"></div>`
            : '';
        const isLiked = false; // Would need user's like history for full implementation

        const card = document.createElement('div');
        card.className = 'reply-card';
        card.id = `reply-${reply.id}`;
        card.innerHTML = `
            <div class="reply-card-header">
                <img src="${avatar}" class="reply-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(reply.username || 'U')}&background=6366f1&color=fff'" alt="">
                <div class="reply-author-info">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="reply-author-name">${reply.username || 'Anonim'}</span>
                        ${badgeHtml}
                    </div>
                    <span class="reply-date">${new Date(reply.created_at).toLocaleString('id-ID')}</span>
                </div>
                <div class="reply-num">#${idx + 1}</div>
                ${deleteBtn}
            </div>
            <div class="reply-card-body">
                ${renderMarkdown(reply.content)}
                ${imageHtml}
            </div>
            <div class="reply-card-footer">
                <button class="reply-like-btn ${isLiked ? 'liked' : ''}" id="likeBtn-${reply.id}" onclick="likeReply(${reply.id})">
                    <i class="fas fa-heart"></i> <span id="likeCount-${reply.id}">${reply.like_count || 0}</span>
                </button>
                <button class="reply-quote-btn" onclick="quoteReply('${encodeURIComponent(reply.username || 'User')}', '${encodeURIComponent(reply.content.substring(0, 80))}')">
                    <i class="fas fa-quote-left"></i> Quote
                </button>
            </div>`;
        list.appendChild(card);
    });
}

// ─── REPLY FORM ───────────────────────────────────────────────────────────────
function setupReplyAccess() {
    const token = localStorage.getItem('hyrostToken');
    const form  = document.getElementById('replyForm');
    const prompt = document.getElementById('replyLoginPrompt');

    if (!token) {
        if (form)   form.style.display   = 'none';
        if (prompt) prompt.style.display = 'block';
        return;
    }

    if (form)   form.style.display   = 'block';
    if (prompt) prompt.style.display = 'none';

    // User avatar
    if (currentUser) {
        const av = document.getElementById('replyUserAvatar');
        if (av) av.src = currentUser.avatar_url || `https://cravatar.eu/helmavatar/${encodeURIComponent(currentUser.username || 'Steve')}/64.png`;
        const nm = document.getElementById('replyUserName');
        if (nm) nm.textContent = currentUser.username || 'Anda';
    }
}

function setupReplyForm() {
    const form = document.getElementById('replyForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token   = localStorage.getItem('hyrostToken');
        if (!token)   return showToast('Silakan login.', 'warn');

        const content = document.getElementById('replyContent').value.trim();
        if (!content) return showToast('Isi balasan tidak boleh kosong.', 'warn');

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

        try {
            const res = await fetch(`${API_URL}/forum/thread/${threadId}/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content, image_url: replyImageB64 || null })
            });
            const data = await res.json();
            if (res.ok) {
                document.getElementById('replyContent').value = '';
                removeReplyImage();
                showToast('Balasan berhasil dikirim!', 'success');
                loadThread(); // Reload full thread to update reply list
            } else {
                showToast(data.message || 'Gagal mengirim balasan.', 'error');
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Balasan';
        }
    });
}

// ─── VOTE ─────────────────────────────────────────────────────────────────────
async function voteThread(type) {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return showToast('Login untuk memberikan vote.', 'warn');

    try {
        const res  = await fetch(`${API_URL}/forum/thread/${threadId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ voteType: type })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            loadThread();
        }
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
}
window.voteThread = voteThread;

// ─── LIKE REPLY ───────────────────────────────────────────────────────────────
async function likeReply(replyId) {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return showToast('Login untuk menyukai balasan.', 'warn');

    try {
        const res  = await fetch(`${API_URL}/forum/reply/${replyId}/like`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            const btn   = document.getElementById(`likeBtn-${replyId}`);
            const count = document.getElementById(`likeCount-${replyId}`);
            if (btn)   btn.classList.toggle('liked', data.liked);
            if (count) count.textContent = parseInt(count.textContent) + (data.liked ? 1 : -1);
        }
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
}
window.likeReply = likeReply;

// ─── DELETE REPLY ─────────────────────────────────────────────────────────────
async function deleteReply(replyId) {
    if (!confirm('Hapus balasan ini?')) return;
    const token = localStorage.getItem('hyrostToken');
    try {
        const res  = await fetch(`${API_URL}/forum/reply/${replyId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Balasan dihapus.', 'success');
            const card = document.getElementById(`reply-${replyId}`);
            if (card) card.remove();
        } else {
            showToast(data.message || 'Gagal.', 'error');
        }
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
}
window.deleteReply = deleteReply;

// ─── PIN THREAD ───────────────────────────────────────────────────────────────
async function pinThread() {
    const token = localStorage.getItem('hyrostToken');
    try {
        const res  = await fetch(`${API_URL}/forum/thread/${threadId}/pin`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            loadThread();
        }
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
}
window.pinThread = pinThread;

// ─── DELETE THREAD ────────────────────────────────────────────────────────────
async function deleteThread() {
    if (!confirm('Hapus thread ini sepenuhnya?')) return;
    const token = localStorage.getItem('hyrostToken');
    try {
        const res = await fetch(`${API_URL}/forum/thread/${threadId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Thread dihapus.', 'success');
            setTimeout(() => { window.location.href = 'forum.html'; }, 1000);
        }
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
}
window.deleteThread = deleteThread;

// ─── QUOTE REPLY ──────────────────────────────────────────────────────────────
function quoteReply(encodedUsername, encodedContent) {
    const username = decodeURIComponent(encodedUsername);
    const content  = decodeURIComponent(encodedContent);
    const textarea = document.getElementById('replyContent');
    if (!textarea) return;
    textarea.value = `> @${username}: ${content}...\n\n` + textarea.value;
    textarea.focus();
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
window.quoteReply = quoteReply;

// ─── SHARE ────────────────────────────────────────────────────────────────────
function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Link thread berhasil disalin!', 'success');
    });
}
window.copyLink = copyLink;

// ─── REPLY IMAGE ──────────────────────────────────────────────────────────────
function handleReplyImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        showToast('Gambar terlalu besar! Maks 2MB.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        replyImageB64 = e.target.result;
        const preview = document.getElementById('replyImagePreview');
        const wrap    = document.getElementById('replyImagePreviewWrap');
        const name    = document.getElementById('replyImageName');
        if (preview) preview.src = e.target.result;
        if (wrap)    wrap.style.display = 'block';
        if (name)    name.textContent = file.name;
    };
    reader.readAsDataURL(file);
}
window.handleReplyImageUpload = handleReplyImageUpload;

function removeReplyImage() {
    replyImageB64 = null;
    const wrap  = document.getElementById('replyImagePreviewWrap');
    const input = document.getElementById('replyImageInput');
    const name  = document.getElementById('replyImageName');
    if (wrap)  wrap.style.display = 'none';
    if (input) input.value = '';
    if (name)  name.textContent = '';
}
window.removeReplyImage = removeReplyImage;

// ─── RICH EDITOR ──────────────────────────────────────────────────────────────
function setupRichEditor(toolbarSelector, textareaId) {
    const toolbar  = document.querySelector(toolbarSelector);
    const textarea = document.getElementById(textareaId);
    if (!toolbar || !textarea) return;

    toolbar.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const start  = textarea.selectionStart;
            const end    = textarea.selectionEnd;
            const sel    = textarea.value.substring(start, end);
            let rep = '';

            switch (action) {
                case 'bold':   rep = `**${sel || 'bold'}**`; break;
                case 'italic': rep = `_${sel || 'italic'}_`; break;
                case 'code':   rep = `\`${sel || 'code'}\``; break;
                case 'quote':  rep = `\n> ${sel || 'kutipan'}\n`; break;
                case 'link': {
                    const url = prompt('Masukkan URL:', 'https://');
                    if (url) rep = `[${sel || 'link'}](${url})`;
                    else return;
                    break;
                }
            }

            textarea.value = textarea.value.substring(0, start) + rep + textarea.value.substring(end);
            textarea.focus();
            textarea.setSelectionRange(start + rep.length, start + rep.length);
        });
    });
}

// ─── MARKDOWN RENDERER ────────────────────────────────────────────────────────
function renderMarkdown(md) {
    if (!md) return '';
    const escaped = md
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return escaped
        .replace(/^### (.+)$/gm,  '<h3>$1</h3>')
        .replace(/^## (.+)$/gm,   '<h2>$1</h2>')
        .replace(/^# (.+)$/gm,    '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/_(.+?)_/g,       '<em>$1</em>')
        .replace(/~~(.+?)~~/g,     '<del>$1</del>')
        .replace(/`{3}([\s\S]*?)`{3}/g, '<pre class="md-code-block"><code>$1</code></pre>')
        .replace(/`(.+?)`/g,       '<code class="md-inline-code">$1</code>')
        .replace(/^\> (.+)$/gm,    '<blockquote class="md-blockquote">$1</blockquote>')
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')
        .replace(/^- (.+)$/gm,     '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/\n\n/g,          '</p><p>')
        .replace(/^(.+)$/gm, (line) => {
            if (/^<(h[1-6]|ul|ol|li|pre|blockquote)/.test(line)) return line;
            return line;
        })
        .replace(/\n/g, '<br>');
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const colors = { success: '#10b981', error: '#ef4444', warn: '#f59e0b', info: '#6366f1' };
    const icons  = { success: 'fa-check-circle', error: 'fa-times-circle', warn: 'fa-exclamation-triangle', info: 'fa-info-circle' };

    const toast = document.createElement('div');
    toast.className = 'forum-toast';
    toast.style.cssText = `border-left: 4px solid ${colors[type] || colors.info};`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}" style="color:${colors[type] || colors.info}; margin-right:8px;"></i>${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}
window.showToast = showToast;
