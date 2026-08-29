/**
 * Hyrost Wall of Fame — Showcase Module Logic
 */

let activeCategory = 'all';
let searchTimeout = null;
let allShowcases = [];

const DEFAULT_MOCK_BUILDS = [
    {
        id: 1,
        title: 'Kastil Obsidian Citadel & Dragon Spire',
        description: 'Kastil megah dengan menara naga berarsitektur gothic obsidian di ketinggian Y:180 Realm Utama.',
        image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
        category: 'Castle',
        coordinates: 'X: 1240, Y: 72, Z: -890',
        likes_count: 142,
        is_liked: false,
        author: { username: 'HyrostArchitect', avatar_url: 'https://cravatar.eu/avatar/Steve/64.png', role: 'Architect' }
    },
    {
        id: 2,
        title: 'Automated Industrial Sorting District',
        description: 'Pusat industri penyimpanan otomatis 128 item dengan stasiun shulker box unloader dan flying machine.',
        image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
        category: 'Redstone',
        coordinates: 'X: -340, Y: 64, Z: 512',
        likes_count: 98,
        is_liked: false,
        author: { username: 'RedstoneMaster', avatar_url: 'https://cravatar.eu/avatar/Alex/64.png', role: 'Engineer' }
    },
    {
        id: 3,
        title: 'Elven Village of Eldoria',
        description: 'Desa peri tersembunyi di kanopi pohon raksasa dengan jembatan gantung dan pencahayaan glowstone mistis.',
        image_url: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&w=1200&q=80',
        category: 'Fantasy',
        coordinates: 'X: 850, Y: 110, Z: 1420',
        likes_count: 115,
        is_liked: false,
        author: { username: 'ForestElf', avatar_url: 'https://cravatar.eu/avatar/Steve/64.png', role: 'VIP+' }
    },
    {
        id: 4,
        title: 'Cyberpunk Metropolis 2077 District',
        description: 'Gedung pencakar langit futuristik dengan billboard neon kaca berwarna, lift air gelembung, dan monorail terbang.',
        image_url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80',
        category: 'Modern',
        coordinates: 'X: -1200, Y: 68, Z: 900',
        likes_count: 87,
        is_liked: false,
        author: { username: 'CyberBuilder', avatar_url: 'https://cravatar.eu/avatar/Alex/64.png', role: 'Member' }
    },
    {
        id: 5,
        title: 'Nordic Harbor & Windmill Village',
        description: 'Pelabuhan kapal drakkar bangsa Nordik lengkap dengan kincir angin fungsional dan gudang perikanan laut.',
        image_url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
        category: 'Medieval',
        coordinates: 'X: 420, Y: 65, Z: -1500',
        likes_count: 104,
        is_liked: false,
        author: { username: 'VikingLord', avatar_url: 'https://cravatar.eu/avatar/Steve/64.png', role: 'Member' }
    },
    {
        id: 6,
        title: 'Subterranean Mountain Vault Base',
        description: 'Markas bawah tanah tahan ledakan tnt di bawah tebing pegunungan es dengan kebun otomatis hidroponik.',
        image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        category: 'Survival Base',
        coordinates: 'X: 1890, Y: 22, Z: 430',
        likes_count: 120,
        is_liked: false,
        author: { username: 'BunkerSurvivalist', avatar_url: 'https://cravatar.eu/avatar/Alex/64.png', role: 'MVP' }
    }
];

document.addEventListener('DOMContentLoaded', () => {
    initCategoryTabs();
    loadShowcases();
});

function initCategoryTabs() {
    const tabs = document.querySelectorAll('#showcaseCategoryTabs .showcase-tab-btn, #showcaseCategoryTabs .inv-tab-btn');
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
    const searchVal = (document.getElementById('showcaseSearchInput')?.value || '').trim().toLowerCase();
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
        let items = [];

        if (res.ok) {
            const result = await res.json();
            if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                items = result.data;
            }
        }

        // Fallback to local default builds if backend returned empty or unreachable
        if (items.length === 0) {
            items = DEFAULT_MOCK_BUILDS.filter(item => {
                const matchCat = activeCategory === 'all' || item.category.toLowerCase() === activeCategory.toLowerCase();
                const matchSearch = !searchVal || item.title.toLowerCase().includes(searchVal) || item.author.username.toLowerCase().includes(searchVal);
                return matchCat && matchSearch;
            });
            if (sortVal === 'newest') {
                items.sort((a, b) => b.id - a.id);
            } else {
                items.sort((a, b) => b.likes_count - a.likes_count);
            }
        }

        allShowcases = items;

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
        console.error('Error loading showcases, using fallback:', err);
        let items = DEFAULT_MOCK_BUILDS.filter(item => {
            const matchCat = activeCategory === 'all' || item.category.toLowerCase() === activeCategory.toLowerCase();
            return matchCat;
        });
        allShowcases = items;
        renderShowcaseGrid(allShowcases);
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
                        <img src="${escapeHtml(item.author.avatar_url || 'https://cravatar.eu/avatar/Steve/32.png')}" alt="${escapeHtml(item.author.username)}">
                        <span>${escapeHtml(item.author.username)}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${item.coordinates ? `
                            <button class="btn-like" onclick="copyCoordinates('${escapeHtml(item.coordinates)}')" title="Salin Koordinat" style="padding:6px 10px;">
                                <i class="fas fa-location-dot" style="color:var(--accent-emerald-light);"></i>
                            </button>
                        ` : ''}
                        <button class="btn-like ${item.is_liked ? 'liked' : ''}" id="likeBtn-${item.id}" onclick="toggleLike(${item.id})">
                            <i class="fas fa-heart"></i>
                            <span id="likeCount-${item.id}">${item.likes_count || 0}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

async function toggleLike(id) {
    const token = localStorage.getItem('hyrostToken');
    if (!token) {
        // Optimistic offline / guest like
        const countEl = document.getElementById(`likeCount-${id}`);
        const btn = document.getElementById(`likeBtn-${id}`);
        if (btn && countEl) {
            const isLiked = btn.classList.toggle('liked');
            let current = parseInt(countEl.textContent, 10) || 0;
            countEl.textContent = isLiked ? current + 1 : Math.max(0, current - 1);
            if (window.HyrostSFX) isLiked ? window.HyrostSFX.playOrb() : window.HyrostSFX.playClick();
        }
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
    const item = allShowcases.find(s => s.id === id) || DEFAULT_MOCK_BUILDS.find(s => s.id === id);
    if (!item) return;

    document.getElementById('inspectModalImg').src = item.image_url;
    document.getElementById('inspectModalTitle').textContent = item.title;
    document.getElementById('inspectModalCategory').textContent = item.category || 'Build';
    document.getElementById('inspectModalDesc').textContent = item.description || 'Tidak ada deskripsi tambahan.';
    
    document.getElementById('inspectModalAuthor').innerHTML = `
        <img src="${escapeHtml(item.author.avatar_url || 'https://cravatar.eu/avatar/Steve/32.png')}" alt="${escapeHtml(item.author.username)}" style="width:32px; height:32px; border-radius:var(--radius-xs);">
        <div>
            <div style="font-size:0.85rem; font-weight:800; color:#fff;">${escapeHtml(item.author.username)}</div>
            <div style="font-size:0.72rem; color:var(--text-dim);">${item.author.role || 'Member'}</div>
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
        window.location.href = '/login';
        return;
    }
    document.getElementById('submitBuildModal').classList.add('active');
    if (window.HyrostSFX) window.HyrostSFX.playClick();
}

function closeSubmitBuildModal() {
    document.getElementById('submitBuildModal').classList.remove('active');
}

function setUploadSourceMode(mode) {
    const tabFile = document.getElementById('tabUploadFile');
    const tabUrl = document.getElementById('tabUploadUrl');
    const dropzone = document.getElementById('dropzoneContainer');
    const urlContainer = document.getElementById('urlInputContainer');

    if (mode === 'file') {
        tabFile.classList.add('active');
        tabUrl.classList.remove('active');
        dropzone.style.display = 'block';
        urlContainer.style.display = 'none';
    } else {
        tabFile.classList.remove('active');
        tabUrl.classList.add('active');
        dropzone.style.display = 'none';
        urlContainer.style.display = 'block';
    }
}

async function handleFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan!');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran file maksimal adalah 10MB!');
        return;
    }

    const token = localStorage.getItem('hyrostToken');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressFill = document.getElementById('uploadProgressFill');
    const previewBox = document.getElementById('imagePreviewBox');
    const previewImg = document.getElementById('imagePreviewImg');
    const badge = document.getElementById('uploadStorageBadge');
    const urlInput = document.getElementById('buildImageUrl');

    if (progressBar && progressFill) {
        progressBar.style.display = 'block';
        progressFill.style.width = '30%';
    }

    // Local instant preview first
    const reader = new FileReader();
    reader.onload = (e) => {
        if (previewImg && previewBox) {
            previewImg.src = e.target.result;
            previewBox.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        if (progressFill) progressFill.style.width = '70%';

        const res = await fetch('/api/upload', {
            method: 'POST',
            headers,
            body: formData
        });

        const data = await res.json();
        if (progressFill) progressFill.style.width = '100%';

        if (data.success && data.url) {
            if (urlInput) urlInput.value = data.url;
            if (badge) {
                const isGdrive = data.storage === 'gdrive';
                badge.innerHTML = isGdrive 
                    ? '<i class="fab fa-google-drive" style="color:#34d399;"></i> Tersimpan di Google Drive'
                    : '<i class="fas fa-database" style="color:var(--accent-cyan);"></i> Tersimpan di MySQL &amp; Hosting';
            }
            if (window.HyrostSFX) window.HyrostSFX.playOrb();
            setTimeout(() => {
                if (progressBar) progressBar.style.display = 'none';
            }, 600);
        } else {
            alert(data.message || 'Gagal mengunggah file.');
            if (progressBar) progressBar.style.display = 'none';
        }
    } catch (err) {
        console.error('Upload error:', err);
        // If upload endpoint is unreachable in standalone client test, use data URL
        if (urlInput && !urlInput.value) {
            urlInput.value = previewImg.src;
        }
        if (progressBar) progressBar.style.display = 'none';
    }
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

    if (!image_url) {
        alert('Harap pilih foto atau masukkan URL gambar karya Anda!');
        return;
    }

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
