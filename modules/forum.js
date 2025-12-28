
const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Forum JS Initializing...');
    
    const threadList = document.getElementById('threadList');
    const modal = document.getElementById('createThreadModal');
    const detailModal = document.getElementById('threadDetailModal');
    const btnCreate = document.getElementById('btnCreateThread');
    const btnClose = document.querySelector('.close-modal');
    const forumForm = document.getElementById('threadForm');
    const replyForm = document.getElementById('replyForm');
    const searchInput = document.getElementById('searchInput');

    let isEditing = false;
    let currentEditId = null;
    let currentOpenThreadId = null;

    checkToken();
    loadThreads();

    // Toolbar Logic
    const toolbarButtons = document.querySelectorAll('.formatting-toolbar button');
    toolbarButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-tag');
            const textarea = document.getElementById('threadContent');
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const selectedText = text.substring(start, end);
            let replacement = "";

            if (tag === 'bold') replacement = `**${selectedText}**`;
            else if (tag === 'italic') replacement = `_${selectedText}_`;
            else if (tag === 'link') {
                const url = prompt("Masukkan URL:", "https://");
                if (url) replacement = `[${selectedText || 'link'}](${url})`;
                else return;
            }

            textarea.value = text.substring(0, start) + replacement + text.substring(end);
            textarea.focus();
            textarea.setSelectionRange(start + replacement.length, start + replacement.length);
        });
    });

    if (btnCreate && modal) {
        btnCreate.addEventListener('click', () => {
            isEditing = false;
            currentEditId = null;
            if (forumForm) {
                forumForm.reset();
                document.getElementById('threadCategory').value = "General";
            }
            modal.querySelector('h3').textContent = 'Buat Thread Baru';
            modal.classList.add('active');
        });
    }

    if (btnClose && modal) {
        btnClose.addEventListener('click', () => modal.classList.remove('active'));
    }

    if (forumForm) {
        forumForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('hyrostToken');
            if (!token) return alert("Silakan login untuk memposting");

            const title = document.getElementById('threadTitle').value;
            const content = document.getElementById('threadContent').value;
            const category = document.getElementById('threadCategory').value;

            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing ? `${API_URL}/forum/thread/${currentEditId}` : `${API_URL}/forum/thread`;

            try {
                const res = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, content, category })
                });
                if (res.ok) {
                    modal.classList.remove('active');
                    loadThreads();
                } else {
                    const data = await res.json();
                    alert(data.message || "Gagal mengirim kiriman");
                }
            } catch (err) { alert("Terjadi kesalahan sistem"); }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.toLowerCase();
            const cards = document.querySelectorAll('.thread-card');
            cards.forEach(card => {
                const title = card.querySelector('.thread-title').textContent.toLowerCase();
                const body = card.querySelector('.thread-body').textContent.toLowerCase();
                if (title.includes(term) || body.includes(term)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    if (replyForm) {
        replyForm.addEventListener('submit', handleReplySubmit);
    }

    // Global Functions
    window.openThreadDetail = async (id) => {
        currentOpenThreadId = id;
        await loadThreadDetails(id);
        if (detailModal) detailModal.classList.add('active');
    };

    window.closeDetailModal = () => {
        if (detailModal) detailModal.classList.remove('active');
        currentOpenThreadId = null;
    };

    window.vote = async (id, voteType, event) => {
        if (event) event.stopPropagation();
        const token = localStorage.getItem('hyrostToken');
        if (!token) return alert("Silakan login untuk memberikan dukungan");

        try {
            const res = await fetch(`${API_URL}/forum/thread/${id}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ voteType })
            });
            if (res.ok) loadThreads();
        } catch (err) { console.error(err); }
    };

    window.editThread = (id, title, content, event, category) => {
        if (event) event.stopPropagation();
        isEditing = true;
        currentEditId = id;
        document.getElementById('threadTitle').value = title;
        document.getElementById('threadContent').value = content;
        document.getElementById('threadCategory').value = category || "General";
        modal.querySelector('h3').textContent = 'Edit Thread';
        modal.classList.add('active');
    };

    window.deleteThread = async (id, event) => {
        if (event) event.stopPropagation();
        if (!confirm("Hapus kiriman ini?")) return;
        const token = localStorage.getItem('hyrostToken');
        try {
            const res = await fetch(`${API_URL}/forum/thread/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) loadThreads();
        } catch (err) { alert("Error"); }
    };

    async function loadThreads() {
        if (!threadList) return;
        try {
            const res = await fetch(`${API_URL}/forum/threads`);
            const threads = await res.json();
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'admin';
            
            threadList.innerHTML = '';
            if (!Array.isArray(threads) || threads.length === 0) {
                threadList.innerHTML = '<p style="color:#888; text-align:center; padding:50px;">Belum ada topik diskusi.</p>';
                return;
            }
            
            threads.forEach(thread => {
                const isOwner = thread.user_id === currentUser.id;
                const threadEl = document.createElement('div');
                threadEl.className = 'thread-card';
                
                let actionsHtml = '';
                if (isOwner || isAdmin) {
                    const titleEsc = (thread.title || '').replace(/'/g, "\\'");
                    const contentEsc = (thread.content || '').replace(/'/g, "\\'");
                    const catEsc = (thread.category || 'General').replace(/'/g, "\\'");
                    actionsHtml = `
                        <div class="thread-actions" style="margin-left:auto;">
                            <button onclick="editThread(${thread.id}, '${titleEsc}', '${contentEsc}', event, '${catEsc}')" class="btn-icon"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteThread(${thread.id}, event)" class="btn-icon" style="color:#ff4d4d"><i class="fas fa-trash"></i></button>
                        </div>
                    `;
                }

                // Render Badge if exists
                const badgeHtml = thread.badge_text ? 
                    `<span class="author-badge" style="background:${thread.badge_color || '#888'}; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-right:5px;">${thread.badge_text}</span>` : '';

                threadEl.innerHTML = `
                    <div class="thread-vote-container">
                        <button class="vote-btn up" onclick="vote(${thread.id}, 'up', event)"><i class="fas fa-chevron-up"></i></button>
                        <span>${thread.vote_score || 0}</span>
                        <button class="vote-btn down" onclick="vote(${thread.id}, 'down', event)"><i class="fas fa-chevron-down"></i></button>
                    </div>
                    <div class="thread-content" onclick="openThreadDetail(${thread.id})">
                        <div class="thread-header">
                            <span class="thread-tags"><span class="tag">${thread.category || 'General'}</span></span>
                            <span style="display:flex; align-items:center; gap:5px;">
                                • Diposting oleh ${badgeHtml} <strong>${thread.username || 'Anonim'}</strong>
                            </span>
                            ${actionsHtml}
                        </div>
                        <a href="javascript:void(0)" class="thread-title">${thread.title}</a>
                        <p class="thread-body" style="color:#aaa; font-size:0.9rem; margin-top:5px; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${thread.content}</p>
                        <div class="thread-meta">
                            <span><i class="fas fa-comment"></i> ${thread.reply_count || 0} Balasan</span>
                            <span><i class="fas fa-clock"></i> ${new Date(thread.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                `;
                threadList.appendChild(threadEl);
            });
        } catch (err) {
            console.error(err);
            threadList.innerHTML = '<p style="color:red">Error loading threads.</p>';
        }
    }

    async function loadThreadDetails(id) {
        try {
            const res = await fetch(`${API_URL}/forum/thread/${id}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            
            const thread = data.thread;
            const badgeHtml = thread.badge_text ? 
                    `<span class="author-badge" style="background:${thread.badge_color || '#888'}; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-right:5px; vertical-align:middle;">${thread.badge_text}</span>` : '';

            document.getElementById('detailTitle').textContent = thread.title;
            document.getElementById('detailHeader').innerHTML = `
                <span class="thread-tags"><span class="tag">${thread.category || 'General'}</span></span>
                <span style="display:flex; align-items:center; gap:5px;">
                    • Diposting oleh ${badgeHtml} <strong>${thread.username}</strong> pada ${new Date(thread.created_at).toLocaleString()}
                </span>
            `;
            document.getElementById('detailBody').textContent = thread.content;
            
            const repliesList = document.getElementById('repliesList');
            if (repliesList) {
                repliesList.innerHTML = '';
                if (data.replies.length === 0) {
                    repliesList.innerHTML = '<p style="color:#888; text-align:center; padding:20px;">Belum ada balasan.</p>';
                } else {
                    data.replies.forEach(reply => {
                        const rBadgeHtml = reply.badge_text ? 
                            `<span class="author-badge" style="background:${reply.badge_color || '#888'}; color:white; padding:1px 5px; border-radius:3px; font-size:0.65rem; font-weight:bold; margin-right:4px;">${reply.badge_text}</span>` : '';

                        const div = document.createElement('div');
                        div.className = 'reply-item';
                        div.innerHTML = `
                            <div class="reply-meta">
                                ${rBadgeHtml}<strong>${reply.username}</strong> • ${new Date(reply.created_at).toLocaleString()}
                            </div>
                            <div class="reply-content">${reply.content}</div>
                        `;
                        repliesList.appendChild(div);
                    });
                }
            }
        } catch (err) { console.error(err); }
    }

    async function handleReplySubmit(e) {
        e.preventDefault();
        const token = localStorage.getItem('hyrostToken');
        if (!token) return alert("Silakan login");
        const contentInput = document.getElementById('replyContent');
        const content = contentInput.value;
        try {
            const res = await fetch(`${API_URL}/forum/thread/${currentOpenThreadId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ content })
            });
            if (res.ok) {
                contentInput.value = '';
                loadThreadDetails(currentOpenThreadId);
                loadThreads(); 
            }
        } catch (err) { alert("Gagal"); }
    }

    function checkToken() {
        const token = localStorage.getItem('hyrostToken');
        if (!token && btnCreate) btnCreate.style.display = 'none';
    }
});
