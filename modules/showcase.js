/**
 * Hyrost Wall of Fame — Showcase Module Logic
 */

let activeCategory = 'all';
let searchTimeout = null;
let allShowcases = [];

document.addEventListener('DOMContentLoaded', () => {
    initCategoryTabs();
    loadShowcases();
});

function initCategoryTabs() {
    const tabs = document.querySelectorAll('#showcaseCategoryTabs .inv-tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.getAttribute('data-cat') || 'all';
            loadShowcases();
        });
    });
}

function debounceSearchShowcases() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        loadShowcases();
    }, 300);
}

async function loadShowcases() {
    const grid = document.getElementById('showcaseGrid');
    const searchVal = (document.getElementById('showcaseSearchInput')?.value || '').trim();
    const sortVal = document.getElementById('showcaseSortSelect')?.value || 'popular';

    const token = localStorage.getItem('hyrostToken');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const params = new URLSearchParams({
            category: activeCategory,
            sort: sortVal,
            search: searchVal
        });

        const res = await fetch(`/api/showcases?${params.toString()}`, { headers });
        const result = await res.json();

        if (!result.success || !Array.isArray(result.data)) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:50px 20px; color:var(--text-muted);">
                    <i class="fas fa-exclamation-circle fa-2x" style="margin-bottom:10px;"></i>
                    <p>Gagal memuat galeri karya.</p>
                </div>
            `;
            return;
        }

        allShowcases = result.data;

        if (allShowcases.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-muted); background:var(--bg-surface-1); border-radius:var(--radius-lg); border:1px solid var(--border-subtle);">
                    <i class="fas fa-cubes-stacked fa-3x" style="color:var(--text-dim); margin-bottom:14px;"></i>
                    <h3 style="color:#fff; margin:0 0 6px;">Belum Ada Karya di Kategori Ini</h3>
                    <p style="font-size:0.85rem; margin-bottom:16px;">Jadilah yang pertama mengunggah karya arsitektur Anda!</p>
                    <button class="btn-header-action btn-primary-action" onclick="openSubmitBuildModal()">
                        <i class="fas fa-plus"></i> Unggah Karya Sekarang
                    </button>
                </div>
            `;
            return;
        }

        renderShowcaseGrid(allShowcases);
    } catch (err) {
        console.error('Error loading showcases:', err);
        grid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:50px 20px; color:#ef4444;">
                <p>Terjadi kesalahan saat memuat data. Silakan coba lagi.</p>
            </div>
        `;
    }
}

function renderShowcaseGrid(items) {
    const grid = document.getElementById('showcaseGrid');
    grid.innerHTML = items.map(item => `
        <div class="showcase-card">
            <div class="showcase-thumb-wrap" onclick="openInspectModal(${item.id})">
                <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" onerror="this.src='https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'">
                <span class="showcase-category-badge">${escapeHtml(item.category || 'Build')}</span>
            </div>
            <div class="showcase-body">
                <h3 class="showcase-title" onclick="openInspectModal(${item.id})" style="cursor:pointer;">${escapeHtml(item.title)}</h3>
                <p class="showcase-desc">${escapeHtml(item.description || 'Tidak ada deskripsi.')}</p>
                <div class="showcase-footer">
                    <div class="showcase-author">
                        <img src="${escapeHtml(item.author.avatar_url)}" alt="${escapeHtml(item.author.username)}">
                        <span>${escapeHtml(item.author.username)}</span>
                    </div>
                    <button class="btn-like ${item.is_liked ? 'liked' : ''}" id="likeBtn-${item.id}" onclick="toggleLike(${item.id})">
                        <i class="fas fa-heart"></i>
                        <span id="likeCount-${item.id}">${item.likes_count || 0}</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function toggleLike(id) {
    const token = localStorage.getItem('hyrostToken');
    if (!token) {
        alert('Silakan login terlebih dahulu untuk memberikan like!');
        window.location.href = '../auth/login.html';
        return;
    }

    if (window.HyrostSFX) window.HyrostSFX.playClick();

    try {
        const res = await fetch(`/api/showcases/${id}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await res.json();
        if (data.success) {
            const btn = document.getElementById(`likeBtn-${id}`);
            const countEl = document.getElementById(`likeCount-${id}`);
            if (btn) {
                if (data.liked) btn.classList.add('liked');
                else btn.classList.remove('liked');
            }
            if (countEl) countEl.textContent = data.likes_count;
            if (data.liked && window.HyrostSFX) window.HyrostSFX.playOrb();
        } else {
            alert(data.message || 'Gagal memproses like');
        }
    } catch (err) {
        console.error('Error toggling like:', err);
    }
}

function openInspectModal(id) {
    const item = allShowcases.find(s => s.id === id);
    if (!item) return;

    document.getElementById('inspectModalImg').src = item.image_url;
    document.getElementById('inspectModalTitle').textContent = item.title;
    document.getElementById('inspectModalCategory').textContent = item.category || 'Build';
    document.getElementById('inspectModalDesc').textContent = item.description || 'Tidak ada deskripsi tambahan.';
    
    document.getElementById('inspectModalAuthor').innerHTML = `
        <img src="${escapeHtml(item.author.avatar_url)}" alt="${escapeHtml(item.author.username)}" style="width:32px; height:32px; border-radius:var(--radius-xs);">
        <div>
            <div style="font-size:0.85rem; font-weight:800; color:#fff;">${escapeHtml(item.author.username)}</div>
            <div style="font-size:0.72rem; color:var(--text-dim);">${item.author.role}</div>
        </div>
    `;

    const coordsDiv = document.getElementById('inspectModalCoords');
    if (item.coordinates && item.coordinates.trim() !== '') {
        coordsDiv.innerHTML = `
            <button class="btn-header-action" onclick="copyCoordinates('${escapeHtml(item.coordinates)}')">
                <i class="fas fa-location-dot" style="color:var(--accent-emerald-light);"></i>
                <span>${escapeHtml(item.coordinates)}</span>
            </button>
        `;
    } else {
        coordsDiv.innerHTML = '';
    }

    document.getElementById('showcaseInspectModal').classList.add('active');
    if (window.HyrostSFX) window.HyrostSFX.playClick();
}

function closeInspectModal() {
    document.getElementById('showcaseInspectModal').classList.remove('active');
}

function openSubmitBuildModal() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) {
        alert('Silakan login terlebih dahulu untuk mengunggah karya build!');
        window.location.href = '../auth/login.html';
        return;
    }
    document.getElementById('submitBuildModal').classList.add('active');
    if (window.HyrostSFX) window.HyrostSFX.playClick();
}

function closeSubmitBuildModal() {
    document.getElementById('submitBuildModal').classList.remove('active');
}

function previewBuildImage(url) {
    const box = document.getElementById('imagePreviewBox');
    const img = document.getElementById('imagePreviewImg');
    if (url && url.startsWith('http')) {
        img.src = url;
        box.style.display = 'block';
    } else {
        box.style.display = 'none';
    }
}

async function handleBuildSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('hyrostToken');
    if (!token) return;

    const title = document.getElementById('buildTitle').value;
    const category = document.getElementById('buildCategory').value;
    const coordinates = document.getElementById('buildCoordinates').value;
    const image_url = document.getElementById('buildImageUrl').value;
    const description = document.getElementById('buildDescription').value;

    try {
        const res = await fetch('/api/showcases', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, category, coordinates, image_url, description })
        });

        const data = await res.json();
        if (data.success) {
            if (window.HyrostSFX) window.HyrostSFX.playLevelUp();
            alert('🎉 Karya build Anda berhasil dipublikasikan ke Wall of Fame!');
            closeSubmitBuildModal();
            document.getElementById('submitBuildForm').reset();
            document.getElementById('imagePreviewBox').style.display = 'none';
            loadShowcases();
        } else {
            alert(data.message || 'Gagal mengunggah karya');
        }
    } catch (err) {
        alert('Terjadi kesalahan saat mengunggah');
    }
}

function copyCoordinates(coords) {
    navigator.clipboard.writeText(coords).then(() => {
        if (window.HyrostSFX) window.HyrostSFX.playOrb();
        alert(`📍 Koordinat ${coords} disalin ke clipboard!`);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
