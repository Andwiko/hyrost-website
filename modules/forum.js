// ═══════════════════════════════════════════════════════════════
// FORUM.JS — Main Forum Page Controller (v4 Role-Based System)
// ═══════════════════════════════════════════════════════════════

const API_URL = '/api';

// ─── STATE ────────────────────────────────────────────────────────────────────
let currentUser    = null;
let userPerms      = null;
let currentSort    = 'latest';
let currentCat     = 'all';
let searchDebounce = null;
let isEditing      = false;
let editingThreadId= null;
let threadImageB64 = null;
let replyImageB64  = null;

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('hyrostToken');
    currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

    // Sidebar mobile toggle
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

    // Admin nav visibility
    const isAdmin = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'admin');
    if (isAdmin) {
        document.body.classList.add('is-admin');
    }
    const adminItems = document.querySelectorAll('.nav-admin');
    adminItems.forEach(el => { el.style.display = isAdmin ? '' : 'none'; });

    // Close modal when clicking on overlay background
    const createModal = document.getElementById('createThreadModal');
    if (createModal) {
        createModal.addEventListener('click', (e) => {
            if (e.target === createModal) closeCreateModal();
        });
    }

    loadCategories();
    loadThreads();
    loadPermissions(token);
    renderUserWidget();
    setupSearchInput();
    setupRichEditor('#threadForm .rich-editor-toolbar', 'threadContent');
    setupCreateForm();
    setupCharCounters();
    setupImageDropZone();
});

// ─── USER WIDGET ──────────────────────────────────────────────────────────────
function renderUserWidget() {
    const body = document.getElementById('userWidgetBody');
    if (!body) return;

    if (currentUser) {
        const avatar = currentUser.avatar_url || `https://cravatar.eu/helmavatar/${currentUser.username || 'Steve'}/64.png`;
        body.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; padding:4px 0 12px;">
                <img src="${avatar}" style="width:42px; height:42px; border-radius:50%; border:2px solid #6366f1;">
                <div>
                    <div style="font-weight:700; color:#fff;">${currentUser.username || 'User'}</div>
                    <div style="font-size:0.75rem; color:#9ca3af;">${currentUser.role || 'Member'}</div>
                </div>
            </div>
            <a href="../account/" style="display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#9ca3af; text-decoration:none; padding:6px 0; border-top:1px solid rgba(255,255,255,0.05);">
                <i class="fas fa-cog"></i> Pengaturan Akun
            </a>
        `;
    }
}

// ─── PERMISSIONS ──────────────────────────────────────────────────────────────
async function loadPermissions(token) {
    if (!token) {
        renderRolePermWidget(null);
        // Hide VIP/Admin categories from create modal
        return;
    }
    try {
        const res  = await fetch(`${API_URL}/forum/permissions`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            userPerms = await res.json();
            renderRolePermWidget(userPerms);
            populateCreateCategories(userPerms);
            // update upload hint
            const hint = document.getElementById('uploadSizeHint');
            if (hint && userPerms.max_image_bytes) {
                hint.textContent = `Maks: ${(userPerms.max_image_bytes / (1024 * 1024)).toFixed(0)}MB`;
            }
        }
    } catch (e) {
        console.error('Perm load failed:', e);
    }
}

function renderRolePermWidget(perms) {
    const body = document.getElementById('rolePermBody');
    if (!body) return;

    if (!perms) {
        body.innerHTML = '<p style="color:#9ca3af; font-size:0.82rem;">Login untuk melihat hak akses Anda.</p>';
        return;
    }

    const role = perms.role || 'Member';
    const roleColors = { Admin: '#ef4444', VIP: '#ffd700', Member: '#6366f1', Guest: '#6b7280' };
    const color = roleColors[role] || '#6b7280';

    const permRow = (icon, label, allowed) =>
        `<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="color:#9ca3af; font-size:0.8rem;"><i class="fas ${icon}" style="width:14px;"></i> ${label}</span>
            <span style="font-size:0.75rem; font-weight:700; color:${allowed ? '#10b981' : '#ef4444'};">
                ${allowed ? '✓' : '✗'}
            </span>
        </div>`;

    body.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; padding:8px; background:rgba(${hexToRgb(color)},0.12); border-radius:8px; border:1px solid rgba(${hexToRgb(color)},0.3);">
            <i class="fas fa-shield-alt" style="color:${color};"></i>
            <span style="font-weight:700; color:${color};">${role}</span>
        </div>
        ${permRow('fa-comments', 'Post General', perms.can_post_general)}
        ${permRow('fa-bullhorn', 'Post Announcement', perms.can_post_announcement)}
        ${permRow('fa-star', 'VIP Lounge', perms.can_post_vip_lounge)}
        ${permRow('fa-thumbtack', 'Pin Thread', perms.can_pin)}
        ${permRow('fa-image', 'Upload Gambar', true)}
        <div style="margin-top:8px; font-size:0.75rem; color:#9ca3af;">
            <i class="fas fa-hdd"></i> Max gambar: ${(perms.max_image_bytes / (1024 * 1024)).toFixed(0)}MB
        </div>
    `;
}

function hexToRgb(hex) {
    if (!hex || !hex.startsWith('#')) return '99,102,241';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}

function populateCreateCategories(perms) {
    const sel = document.getElementById('threadCategory');
    if (!sel || !perms) return;

    const allCats = [
        { value: 'General',      label: '💬 General',       minRole: 2 },
        { value: 'Guides',       label: '📖 Guides & Tips', minRole: 2 },
        { value: 'Economy',      label: '💰 Economy',       minRole: 2 },
        { value: 'Minecraft',    label: '🧱 Minecraft',     minRole: 2 },
        { value: 'Report',       label: '🚩 Report',        minRole: 2 },
        { value: 'Announcement', label: '📢 Announcement',  minRole: 3 },
        { value: 'Game-Updates', label: '🚀 Game Updates',  minRole: 3 },
        { value: 'VIP-Lounge',   label: '⭐ VIP Lounge',    minRole: 3 },
    ];

    sel.innerHTML = '';
    allCats.forEach(cat => {
        const allowed = perms.allowed_categories && perms.allowed_categories.includes(cat.value);
        if (allowed) {
            const opt = document.createElement('option');
            opt.value = cat.value;
            opt.textContent = cat.label;
            sel.appendChild(opt);
        }
    });
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
async function loadCategories() {
    try {
        const res  = await fetch(`${API_URL}/forum/categories`);
        if (res.ok) {
            const cats = await res.json();
            if (Array.isArray(cats)) {
                renderCategories(cats);
                return;
            }
        }
    } catch (e) {}

    renderCategories([]);
}

function renderCategories(cats) {
    const list = document.getElementById('categoryList');
    if (!list) return;

    let totalThreads = cats.reduce((s, c) => s + (c.thread_count || 0), 0);
    const statTotal = document.getElementById('statTotalThreads');
    if (statTotal) statTotal.textContent = totalThreads;

    const allBtn = list.querySelector('[data-cat="all"]');
    const allCount = list.querySelector('#catCount-all');
    if (allCount) allCount.textContent = totalThreads;

    cats.forEach(cat => {
        const existing = list.querySelector(`[data-cat="${cat.category}"]`);
        if (!existing && cat.category !== 'all') {
            const btn = document.createElement('button');
            btn.className = 'forum-cat-item';
            btn.setAttribute('data-cat', cat.category);
            btn.onclick = () => filterCategory(cat.category);
            btn.innerHTML = `
                <span class="cat-icon" style="color:${cat.color || '#6366f1'};"><i class="fas ${cat.icon || 'fa-folder'}"></i></span>
                <span class="cat-name">${cat.category}</span>
                <span class="cat-count">${cat.thread_count || 0}</span>
            `;
            list.appendChild(btn);
        }
    });

    const statMembers = document.getElementById('statTotalMembers');
    const statOnline = document.getElementById('statOnlineNow');
    if (statMembers) statMembers.textContent = '—';
    if (statOnline) statOnline.textContent = '—';

    fetch(`${API_URL}/minecraft/status`)
        .then(r => r.ok ? r.json() : null)
        .then(status => {
            if (status && statOnline) statOnline.textContent = status.playerCount ?? '—';
        })
        .catch(() => {});
}

// ─── THREAD LIST ──────────────────────────────────────────────────────────────
async function loadThreads() {
    const threadList = document.getElementById('threadList');
    if (threadList) {
        threadList.innerHTML = `<div class="forum-empty-state"><i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i><p>Memuat diskusi...</p></div>`;
    }

    const params = new URLSearchParams({ sort: currentSort });
    if (currentCat !== 'all') params.set('category', currentCat);
    const searchVal = document.getElementById('forumSearchInput')?.value?.trim();
    if (searchVal) params.set('search', searchVal);

    try {
        const res     = await fetch(`${API_URL}/forum/threads?${params}`);
        if (res.ok) {
            const threads = await res.json();
            if (Array.isArray(threads)) {
                renderThreadList(threads);
                return;
            }
        }
    } catch (err) {}

    renderThreadList([]);
}

function renderThreadList(threads) {
    const threadList  = document.getElementById('threadList');
    const pinnedList  = document.getElementById('pinnedList');
    const pinnedSection = document.getElementById('pinnedSection');

    if (threadList)  threadList.innerHTML  = '';
    if (pinnedList)  pinnedList.innerHTML  = '';
    if (pinnedSection) pinnedSection.style.display = 'none';

    if (!threads || threads.length === 0) {
        if (threadList) {
            threadList.innerHTML = `
                <div class="forum-empty-state">
                    <i class="fas fa-comment-slash"></i>
                    <h3>Belum ada diskusi</h3>
                    <p>Jadilah yang pertama membuat thread di kategori ini!</p>
                    <button class="btn-create-thread" onclick="openCreateModal()" style="margin-top:12px;"><i class="fas fa-plus"></i> Buat Thread</button>
                </div>`;
        }
        return;
    }

    const isAdmin = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'admin');

    threads.forEach(thread => {
        const isOwner = currentUser && thread.user_id === currentUser.id;
        const card    = buildThreadCard(thread, isOwner, isAdmin);

        if (thread.is_pinned && pinnedList) {
            pinnedList.insertAdjacentHTML('beforeend', card);
            if (pinnedSection) pinnedSection.style.display = 'block';
        } else if (threadList) {
            threadList.insertAdjacentHTML('beforeend', card);
        }
    });
}

function buildThreadCard(thread, isOwner, isAdmin) {
    const catColors = {
        General: '#6366f1', Announcement: '#ef4444', Guides: '#10b981',
        Economy: '#f59e0b', 'Game-Updates': '#06b6d4', 'VIP-Lounge': '#ffd700',
        Report: '#ef4444', Minecraft: '#84cc16'
    };
    const catIcons = {
        General: 'fa-comments', Announcement: 'fa-bullhorn', Guides: 'fa-book',
        Economy: 'fa-coins', 'Game-Updates': 'fa-code-branch', 'VIP-Lounge': 'fa-star',
        Report: 'fa-flag', Minecraft: 'fa-cube'
    };

    const catColor  = catColors[thread.category]  || '#6366f1';
    const catIcon   = catIcons[thread.category]   || 'fa-comments';
    const avatar    = thread.avatar_url || `https://cravatar.eu/helmavatar/${encodeURIComponent(thread.username || 'Steve')}/64.png`;
    const badgeHtml = thread.badge_text
        ? `<span class="author-role-badge" style="background:${thread.badge_color || '#888'};">${thread.badge_text}</span>`
        : '';

    const tags = thread.tags ? thread.tags.split(',').filter(Boolean).slice(0, 3)
        .map(t => `<span class="thread-tag-pill">#${t.trim()}</span>`).join('') : '';

    const thumbHtml = thread.image_url
        ? `<img src="${thread.image_url}" class="thread-thumb" alt="thumb">`
        : '';

    const adminBtns = isAdmin ? `
        <button class="thread-action-btn btn-pin" onclick="event.stopPropagation(); pinThread(${thread.id})" title="${thread.is_pinned ? 'Unpin' : 'Pin'}">
            <i class="fas fa-thumbtack"></i>
        </button>
        <button class="thread-action-btn btn-delete-thread" onclick="event.stopPropagation(); deleteThread(${thread.id})" title="Hapus">
            <i class="fas fa-trash"></i>
        </button>` : '';
    const ownerBtns = isOwner ? `
        <button class="thread-action-btn btn-edit-thread" onclick="event.stopPropagation(); editThread(${thread.id}, '${encodeURI(thread.title)}', '${encodeURI(thread.content)}', '${thread.category}', '${thread.tags || ''}')" title="Edit">
            <i class="fas fa-edit"></i>
        </button>` : '';

    return `
        <div class="forum-thread-card ${thread.is_pinned ? 'is-pinned' : ''}" onclick="window.location.href='forum-thread.html?id=${thread.id}'">
            <div class="thread-card-cat-icon" style="background:${catColor}22; color:${catColor};">
                <i class="fas ${catIcon}"></i>
            </div>
            <div class="thread-card-body">
                <div class="thread-card-top">
                    ${thread.is_pinned ? '<span class="pinned-chip"><i class="fas fa-thumbtack"></i> Pin</span>' : ''}
                    <span class="cat-chip" style="background:${catColor}22; color:${catColor};">${thread.category || 'General'}</span>
                    ${tags}
                </div>
                <div class="thread-card-title">${thread.title}</div>
                <div class="thread-card-excerpt">${stripMarkdown(thread.content).substring(0, 120)}${thread.content.length > 120 ? '...' : ''}</div>
                <div class="thread-card-meta">
                    <img src="${avatar}" class="meta-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(thread.username || 'U')}&background=6366f1&color=fff'" alt="">
                    <span>${thread.username || 'Anonim'}</span>
                    ${badgeHtml}
                    <span class="meta-sep">•</span>
                    <span>${timeAgo(new Date(thread.created_at))}</span>
                </div>
            </div>
            ${thumbHtml}
            <div class="thread-card-stats">
                <div class="stat-chip"><i class="fas fa-comment-alt"></i> ${thread.reply_count || 0}</div>
                <div class="stat-chip"><i class="fas fa-arrow-up"></i> ${thread.vote_score || 0}</div>
                <div class="stat-chip"><i class="fas fa-eye"></i> ${thread.views || 0}</div>
                <div class="thread-card-actions">${ownerBtns}${adminBtns}</div>
            </div>
        </div>`;
}

// ─── FILTER / SORT ────────────────────────────────────────────────────────────
function filterCategory(cat) {
    currentCat = cat;
    document.querySelectorAll('.forum-cat-item').forEach(b => {
        b.classList.toggle('active', b.dataset.cat === cat);
    });

    const bar   = document.getElementById('activeCatBar');
    const label = document.getElementById('activeCatLabel');
    if (bar && label) {
        if (cat !== 'all') {
            bar.style.display = 'flex';
            label.textContent = `Kategori: ${cat}`;
        } else {
            bar.style.display = 'none';
        }
    }
    loadThreads();
}
window.filterCategory = filterCategory;

function setSort(sort) {
    currentSort = sort;
    document.querySelectorAll('.sort-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.sort === sort);
    });
    loadThreads();
}
window.setSort = setSort;

function setupSearchInput() {
    const input = document.getElementById('forumSearchInput');
    if (!input) return;
    input.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(loadThreads, 420);
    });
}

// ─── CREATE/EDIT MODAL ────────────────────────────────────────────────────────
function openCreateModal() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) {
        showToast('Silakan login untuk membuat thread.', 'warn');
        return;
    }
    isEditing       = false;
    editingThreadId = null;
    threadImageB64  = null;
    document.getElementById('threadForm').reset();
    document.getElementById('imagePreviewWrap').style.display = 'none';
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Buat Thread Baru';
    document.getElementById('submitBtnLabel').textContent = 'Publikasikan';
    document.getElementById('createThreadModal').classList.add('active');
}
window.openCreateModal = openCreateModal;

function closeCreateModal() {
    document.getElementById('createThreadModal').classList.remove('active');
}
window.closeCreateModal = closeCreateModal;

function editThread(id, encodedTitle, encodedContent, category, tags) {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return;
    isEditing       = true;
    editingThreadId = id;
    threadImageB64  = null;

    document.getElementById('threadTitle').value   = decodeURI(encodedTitle);
    document.getElementById('threadContent').value = decodeURI(encodedContent);
    document.getElementById('threadTags').value    = tags || '';
    const sel = document.getElementById('threadCategory');
    if (sel) {
        // Add option if not present (for restricted categories shown to owner/admin)
        let opt = [...sel.options].find(o => o.value === category);
        if (!opt) {
            opt = document.createElement('option');
            opt.value = category;
            opt.textContent = category;
            sel.appendChild(opt);
        }
        sel.value = category;
    }

    document.getElementById('imagePreviewWrap').style.display = 'none';
    document.getElementById('modalTitle').innerHTML  = '<i class="fas fa-edit"></i> Edit Thread';
    document.getElementById('submitBtnLabel').textContent = 'Simpan Perubahan';
    document.getElementById('createThreadModal').classList.add('active');
}
window.editThread = editThread;

function setupCreateForm() {
    const form = document.getElementById('threadForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('hyrostToken');
        if (!token) return showToast('Silakan login terlebih dahulu.', 'error');

        const btn   = document.getElementById('submitThreadBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

        const payload = {
            title:    document.getElementById('threadTitle').value.trim(),
            content:  document.getElementById('threadContent').value.trim(),
            category: document.getElementById('threadCategory').value,
            tags:     document.getElementById('threadTags').value.trim(),
            image_url: threadImageB64 || null
        };

        try {
            const method = isEditing ? 'PUT' : 'POST';
            const url    = isEditing
                ? `${API_URL}/forum/thread/${editingThreadId}`
                : `${API_URL}/forum/thread`;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                closeCreateModal();
                showToast(isEditing ? 'Thread berhasil diperbarui!' : 'Thread berhasil dipublikasikan!', 'success');
                loadThreads();
                loadCategories();
                return;
            }
            const errData = await res.json().catch(() => ({}));
            showToast(errData.message || 'Gagal menyimpan thread.', 'error');
        } catch (err) {
            showToast('Gagal terhubung ke server.', 'error');
        }

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> <span id="submitBtnLabel">' + (isEditing ? 'Simpan Perubahan' : 'Publikasikan') + '</span>';
    });
}

// ─── DELETE / PIN THREAD ──────────────────────────────────────────────────────
async function deleteThread(id) {
    if (!confirm('Hapus thread ini?')) return;
    const token = localStorage.getItem('hyrostToken');
    try {
        const res = await fetch(`${API_URL}/forum/thread/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Thread berhasil dihapus.', 'success');
            loadThreads();
        } else {
            const d = await res.json();
            showToast(d.message || 'Gagal menghapus.', 'error');
        }
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
}
window.deleteThread = deleteThread;

async function pinThread(id) {
    const token = localStorage.getItem('hyrostToken');
    try {
        const res  = await fetch(`${API_URL}/forum/thread/${id}/pin`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message || 'Status pin diperbarui.', 'success');
            loadThreads();
        } else {
            showToast(data.message || 'Gagal.', 'error');
        }
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
}
window.pinThread = pinThread;

// ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────────
function handleThreadImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const maxBytes = userPerms ? userPerms.max_image_bytes : 5 * 1024 * 1024;

    if (file.size > maxBytes) {
        document.getElementById('imageError').textContent = `Gambar terlalu besar! Maks ${(maxBytes / (1024 * 1024)).toFixed(0)}MB.`;
        event.target.value = '';
        return;
    }
    document.getElementById('imageError').textContent = '';

    const reader = new FileReader();
    reader.onload = (e) => {
        threadImageB64 = e.target.result;
        document.getElementById('imagePreview').src    = e.target.result;
        document.getElementById('imagePreviewWrap').style.display = 'block';
    };
    reader.readAsDataURL(file);
}
window.handleThreadImageUpload = handleThreadImageUpload;

function removeThreadImage() {
    threadImageB64 = null;
    document.getElementById('imagePreviewWrap').style.display = 'none';
    document.getElementById('threadImageInput').value = '';
}
window.removeThreadImage = removeThreadImage;

// ─── RICH TEXT EDITOR ─────────────────────────────────────────────────────────
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
                case 'bold':    rep = `**${sel || 'bold text'}**`; break;
                case 'italic':  rep = `_${sel || 'italic text'}_`; break;
                case 'strike':  rep = `~~${sel || 'text'}~~`; break;
                case 'heading': rep = `\n## ${sel || 'Heading'}\n`; break;
                case 'quote':   rep = `\n> ${sel || 'Kutipan...'}\n`; break;
                case 'code':    rep = sel.includes('\n') ? `\n\`\`\`\n${sel || 'code'}\n\`\`\`\n` : `\`${sel || 'code'}\``; break;
                case 'link': {
                    const url = prompt('Masukkan URL:', 'https://');
                    if (url) rep = `[${sel || 'link text'}](${url})`;
                    else return;
                    break;
                }
                case 'image': {
                    const url = prompt('Masukkan URL Gambar (atau upload gambar di area lampiran bawah):', 'https://');
                    if (url) rep = `![${sel || 'Gambar'}](${url})`;
                    else return;
                    break;
                }
                case 'ul': rep = `\n- ${sel || 'item'}\n`; break;
                case 'ol': rep = `\n1. ${sel || 'item'}\n`; break;
            }

            textarea.value = textarea.value.substring(0, start) + rep + textarea.value.substring(end);
            textarea.focus();
            textarea.setSelectionRange(start + rep.length, start + rep.length);
            textarea.dispatchEvent(new Event('input'));
        });
    });
}

// ─── CHAR COUNTERS ────────────────────────────────────────────────────────────
function setupCharCounters() {
    const title   = document.getElementById('threadTitle');
    const content = document.getElementById('threadContent');
    const titleC  = document.getElementById('titleCharCount');
    const contentC= document.getElementById('contentCharCount');

    if (title   && titleC)  title.addEventListener('input',   () => { titleC.textContent   = title.value.length; });
    if (content && contentC) content.addEventListener('input', () => { contentC.textContent = content.value.length; });
}

// ─── IMAGE DRAG & DROP ZONE ───────────────────────────────────────────────────
function setupImageDropZone() {
    const zone = document.getElementById('imageUploadArea');
    if (!zone) return;

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', ()  => { zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const fakeEvent = { target: { files: [file], value: '' } };
            handleThreadImageUpload(fakeEvent);
        }
    });
}

// ─── TOAST NOTIFICATIONS ──────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const colors = { success: '#10b981', error: '#ef4444', warn: '#f59e0b', info: '#6366f1' };
    const icons  = { success: 'fa-check-circle', error: 'fa-times-circle', warn: 'fa-exclamation-triangle', info: 'fa-info-circle' };

    const toast = document.createElement('div');
    toast.className = 'forum-toast';
    toast.style.cssText = `border-left: 4px solid ${colors[type] || colors.info};`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}" style="color:${colors[type] || colors.info}; margin-right:8px;"></i> ${msg}`;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}
window.showToast = showToast;

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function timeAgo(date) {
    const s  = Math.floor((new Date() - date) / 1000);
    const t  = [[31536000, 'tahun'], [2592000, 'bulan'], [86400, 'hari'], [3600, 'jam'], [60, 'menit']];
    for (const [secs, unit] of t) {
        const n = Math.floor(s / secs);
        if (n >= 1) return `${n} ${unit} lalu`;
    }
    return 'Baru saja';
}
window.timeAgo = timeAgo;

function stripMarkdown(md) {
    return (md || '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/#+\s/g, '')
        .replace(/>\s/g, '')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/\n/g, ' ');
}
