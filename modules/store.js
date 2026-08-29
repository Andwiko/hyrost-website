/* =====================================================
   HYROST WEB STORE & RANK PERKS MANAGER
   ===================================================== */

'use strict';

let currentCurrencyMode = 'idr'; // Default 'idr' or 'gold'
let selectedCheckoutRank = null;
let currentDiscountRate = 1.0;
let storePaymentMethods = [];
let storeResultOnClose = null;

function showStoreToast(message, type = 'success') {
    const toast = document.getElementById('storeToast');
    const text = document.getElementById('storeToastText');
    if (!toast || !text) return;

    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.className = `store-toast show ${type}`;
    toast.querySelector('i').className = `fas ${icons[type] || icons.info}`;
    text.textContent = message;

    clearTimeout(showStoreToast._timer);
    showStoreToast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function showStoreResult(options = {}) {
    const {
        type = 'success',
        title = 'Pembayaran Berhasil',
        message = '',
        transactionId = '',
        securityHash = '',
        instructions = '',
        onClose = null,
    } = options;

    const modal = document.getElementById('storeResultModal');
    const icon = document.getElementById('storeResultIcon');
    const titleEl = document.getElementById('storeResultTitle');
    const messageEl = document.getElementById('storeResultMessage');
    const metaEl = document.getElementById('storeResultMeta');
    const hintEl = document.getElementById('storeResultHint');
    const hintText = document.getElementById('storeResultHintText');
    const btn = document.getElementById('btnStoreResultClose');

    if (!modal) return;

    const iconMap = {
        success: { cls: 'success', icon: 'fa-check' },
        pending: { cls: 'pending', icon: 'fa-clock' },
        error:   { cls: 'error',   icon: 'fa-times' },
    };
    const cfg = iconMap[type] || iconMap.success;

    icon.className = `store-result-icon ${cfg.cls}`;
    icon.innerHTML = `<i class="fas ${cfg.icon}"></i>`;
    titleEl.textContent = title;
    messageEl.textContent = message;

    const rows = [];
    if (transactionId) {
        rows.push({ label: 'ID Transaksi', value: transactionId });
    }
    if (securityHash) {
        rows.push({ label: 'Hash Keamanan', value: securityHash });
    }

    if (rows.length) {
        metaEl.style.display = 'block';
        metaEl.innerHTML = rows.map(r => `
            <div class="store-result-row">
                <span class="store-result-label">${r.label}</span>
                <span class="store-result-value">${escapeHTML(r.value)}</span>
            </div>
        `).join('');
    } else {
        metaEl.style.display = 'none';
        metaEl.innerHTML = '';
    }

    if (instructions) {
        hintEl.style.display = 'flex';
        const safe = escapeHTML(instructions);
        hintText.innerHTML = safe.replace('/claim', '<code>/claim</code>');
    } else {
        hintEl.style.display = 'none';
        hintText.textContent = '';
    }

    btn.className = `btn-store-result${type === 'error' ? ' error' : ''}`;
    storeResultOnClose = typeof onClose === 'function' ? onClose : null;

    modal.classList.add('active');
}

function closeStoreResultModal() {
    const modal = document.getElementById('storeResultModal');
    if (modal) modal.classList.remove('active');
    if (storeResultOnClose) {
        const cb = storeResultOnClose;
        storeResultOnClose = null;
        cb();
    }
}
window.closeStoreResultModal = closeStoreResultModal;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnStoreResultClose')?.addEventListener('click', closeStoreResultModal);
    document.getElementById('storeResultModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'storeResultModal') closeStoreResultModal();
    });

    loadUserGoldBalance();
    loadRanksCatalog();
});

function switchStoreCurrency(mode) {
    currentCurrencyMode = mode;

    const btnIDR = document.getElementById('btnCurrIDR');
    const btnGold = document.getElementById('btnCurrGold');

    if (mode === 'idr') {
        btnIDR?.classList.add('active');
        btnGold?.classList.remove('active');
    } else {
        btnGold?.classList.add('active');
        btnIDR?.classList.remove('active');
    }

    loadRanksCatalog();
}
window.switchStoreCurrency = switchStoreCurrency;

async function loadUserGoldBalance() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return;

    try {
        const res = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            const el = document.getElementById('userGoldBalance');
            if (el) el.textContent = user.coins?.gold || user.coin_gold || 0;
        }
    } catch (e) {
        console.error("Load gold balance error:", e);
    }
}

async function loadRanksCatalog() {
    const grid = document.getElementById('rankStoreGrid');
    if (!grid) return;

    const fallbackRanks = [
        { name: 'VIP', badge_text: 'VIP', badge_color: '#ffd700', price_coin: 100, price_idr: 15000, description: 'Pangkat pendatang baru dengan berbagai keuntungan dasar realm.', perks: ['Akses perintah /fly di Lobby & Claim Land', 'Warna obrolan game Kuning Emas', 'Bonus +50 Koin Bronze klaim harian', '1x Crate Key Common gratis per hari', 'Batas Klaim Tanah: 5,000 Blocks'] },
        { name: 'MVP', badge_text: 'MVP', badge_color: '#06b6d4', price_coin: 250, price_idr: 35000, description: 'Pangkat populer pilihan pemain aktif realm.', perks: ['Akses perintah /fly & /heal (cooldown 5m)', 'Warna obrolan game Cyan Glow', 'Akses perintah /hat & /workbench', 'Bonus +150 Koin Bronze klaim harian', '2x Crate Key Rare gratis per hari', 'Batas Klaim Tanah: 15,000 Blocks'] },
        { name: 'SULTAN', badge_text: 'SULTAN', badge_color: '#ec4899', price_coin: 500, price_idr: 75000, description: 'Pangkat elite dengan hak istimewa tinggi di realm.', perks: ['Akses perintah /fly, /heal & /feed (tanpa cooldown)', 'Warna obrolan game Magenta Sultan & Neon Nameplate', 'Akses perintah /enderchest & /condense', 'Bonus +300 Koin Bronze + 5 Gold Coins harian', '3x Crate Key Epic gratis per hari', 'Batas Klaim Tanah: 50,000 Blocks'] },
        { name: 'HYROST ROYAL', badge_text: 'ROYAL', badge_color: '#8b5cf6', price_coin: 1000, price_idr: 150000, description: 'Pangkat tertinggi penguasa Hyrost Realm dengan seluruh akses unlimted.', perks: ['Seluruh Akses Perintah VIP, MVP & SULTAN', 'Bebas Biaya Pajak Marketplace', 'Warna Obrolan Rainbow Animated & Tag ROYAL Eksklusif', 'Bonus +500 Koin Bronze + 15 Gold Coins harian', '5x Crate Key Legendary gratis per hari', 'Batas Klaim Tanah: UNLIMITED Blocks'] }
    ];

    let ranks = fallbackRanks;

    try {
        const res = await fetch('/api/store/ranks');
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.ranks) && data.ranks.length > 0) {
                ranks = data.ranks;
            }
        }
    } catch (err) {
        console.warn("Using fallback store catalog due to fetch notice:", err);
    }

    grid.innerHTML = ranks.map(r => {
        const isFeatured = (r.name || '').toUpperCase() === 'SULTAN' || (r.name || '').toUpperCase() === 'HYROST ROYAL';
        const color = r.badge_color || '#6366f1';
        
        const priceCoin = r.price_coin || 100;
        const priceIDR = r.price_idr || (priceCoin * 150);

        const isIDR = currentCurrencyMode === 'idr';
        const priceDisplay = isIDR ? `Rp ${priceIDR.toLocaleString('id-ID')}` : `${priceCoin} Gold`;
        const buttonIcon = isIDR ? 'fa-credit-card' : 'fa-coins';
        const buttonText = isIDR ? `BELI ${escapeHTML(r.name || '')} (${priceDisplay})` : `TUKAR ${priceCoin} GOLD`;
        const buttonBg = isIDR ? 'linear-gradient(135deg, #10b981, #059669)' : color;
        const buttonTextColor = isIDR ? '#ffffff' : '#000000';

        return `
            <div class="rank-card ${isFeatured ? 'featured' : ''}">
                ${isFeatured ? '<div class="rank-badge-ribbon">POPULER</div>' : ''}
                <div class="rank-header">
                    <div class="rank-icon-wrapper" style="background:${color}22; color:${color}; border: 1px solid ${color}44;">
                        <i class="fas fa-crown"></i>
                    </div>
                    <div class="rank-name" style="color:${color};">${escapeHTML(r.name || '')}</div>
                    <span class="rank-badge-pill" style="background:${color}33; color:${color}; border:1px solid ${color}66;">
                        ${escapeHTML(r.badge_text || r.name || '')}
                    </span>
                    <div class="rank-price-tag">
                        <i class="fas ${isIDR ? 'fa-money-bill-wave' : 'fa-coins'}" style="color:${isIDR ? '#10b981' : 'var(--accent-gold)'};"></i>
                        <span>${priceDisplay}</span>
                    </div>
                </div>

                <p style="font-size:0.82rem; color:var(--text-dim); text-align:center; margin-bottom:16px; min-height:36px;">
                    ${escapeHTML(r.description || '')}
                </p>

                <ul class="perks-list">
                    ${(r.perks || []).map(p => `
                        <li><i class="fas fa-check-circle"></i> <span>${escapeHTML(p)}</span></li>
                    `).join('')}
                </ul>

                <button class="btn-buy-rank" style="background:${buttonBg}; color:${buttonTextColor}; border:none;" onclick="handleRankPurchaseClick('${escapeHTML(r.name || '')}', ${priceCoin}, ${priceIDR})">
                    <i class="fas ${buttonIcon}"></i> ${buttonText}
                </button>
            </div>
        `;
    }).join('');
}

function handleRankPurchaseClick(rankName, priceCoin, priceIDR) {
    if (currentCurrencyMode === 'gold') {
        buyRankWithGold(rankName, priceCoin);
    } else {
        openRankCheckoutModal(rankName, priceIDR);
    }
}
window.handleRankPurchaseClick = handleRankPurchaseClick;

async function buyRankWithGold(rankName, priceCoin) {
    const token = localStorage.getItem('hyrostToken');
    if (!token) {
        showStoreToast('Silakan login terlebih dahulu untuk membeli pangkat!', 'error');
        window.location.href = '../index.html';
        return;
    }

    if (!confirm(`Konfirmasi: Apakah Anda yakin ingin menukarkan ${priceCoin} Gold Coins untuk mendapatkan Pangkat ${rankName}?`)) {
        return;
    }

    try {
        const res = await fetch('/api/store/buy-rank', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rankName })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showStoreResult({
                type: 'success',
                title: 'Pangkat Diaktifkan',
                message: data.message || `Selamat! Anda berhasil menjadi ${rankName}.`,
                instructions: 'Ketik /claim di server Minecraft (In-Game) untuk menyinkronkan pangkat Anda.',
                onClose: () => loadUserGoldBalance(),
            });
        } else {
            showStoreResult({
                type: 'error',
                title: 'Transaksi Gagal',
                message: data.message || 'Gagal memproses transaksi pangkat.',
            });
        }
    } catch (e) {
        showStoreToast('Error: ' + e.message, 'error');
    }
}

// Open IDR Checkout Payment Gateway Modal
async function openRankCheckoutModal(rankName, priceIDR) {
    const token = localStorage.getItem('hyrostToken');
    if (!token) {
        showStoreToast('Silakan login terlebih dahulu untuk membeli pangkat!', 'error');
        window.location.href = '../index.html';
        return;
    }

    selectedCheckoutRank = { rankName, basePrice: priceIDR };
    currentDiscountRate = 1.0;

    const modal = document.getElementById('rankCheckoutModal');
    if (!modal) return;

    document.getElementById('checkoutRankName').textContent = rankName;
    updateCheckoutPriceDisplay();

    // Check linked MC account
    let mcTargetText = "🎮 Target MC: Belum Ditautkan";
    try {
        const mcRes = await fetch('/api/minecraft/link-status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (mcRes.ok) {
            const mcData = await mcRes.json();
            if (mcData.isLinked) {
                mcTargetText = `🎮 Target MC: ${mcData.mcUsername}`;
            }
        }
    } catch (e) {}
    document.getElementById('checkoutMcTarget').textContent = mcTargetText;

    await loadStorePaymentMethods();
    renderCheckoutPayMethods();
    modal.classList.add('active');
}
window.openRankCheckoutModal = openRankCheckoutModal;

async function loadStorePaymentMethods() {
    try {
        const res = await fetch('/api/store/payment-methods');
        if (res.ok) {
            const data = await res.json();
            storePaymentMethods = (data.methods || []).filter(m => m.is_active !== false);
        }
    } catch (e) {
        storePaymentMethods = [];
    }
}

function renderCheckoutPayMethods() {
    const grid = document.getElementById('checkoutPayMethodsGrid');
    if (!grid) return;

    if (storePaymentMethods.length === 0) {
        grid.innerHTML = '<p style="color:#9ca3af; grid-column:1/-1; text-align:center; padding:12px;">Metode pembayaran belum tersedia.</p>';
        return;
    }

    grid.innerHTML = storePaymentMethods.map((m, i) => `
        <label class="pay-method-card ${i === 0 ? 'active' : ''}">
            <input type="radio" name="payMethod" value="${escapeHTML(m.key)}" ${i === 0 ? 'checked' : ''} onchange="updateCheckoutMethod('${escapeHTML(m.key)}')">
            <i class="fas ${escapeHTML(m.icon || 'fa-credit-card')}" style="color:${escapeHTML(m.color || '#10b981')};"></i>
            <span>${escapeHTML(m.name)}</span>
        </label>
    `).join('');

    updateCheckoutMethod(storePaymentMethods[0].key);
}

function closeRankCheckoutModal() {
    const modal = document.getElementById('rankCheckoutModal');
    if (modal) modal.classList.remove('active');
}
window.closeRankCheckoutModal = closeRankCheckoutModal;

function updateCheckoutPriceDisplay() {
    if (!selectedCheckoutRank) return;
    const finalPrice = Math.round(selectedCheckoutRank.basePrice * currentDiscountRate);
    const el = document.getElementById('checkoutRankPrice');
    if (el) el.textContent = `Rp ${finalPrice.toLocaleString('id-ID')}`;
}

function copyTextToClipboard(text) {
    const done = () => showStoreToast('Berhasil disalin ke clipboard', 'success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopyText(text, done));
    } else {
        fallbackCopyText(text, done);
    }
}
function fallbackCopyText(text, onDone) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    if (onDone) onDone();
}
window.copyTextToClipboard = copyTextToClipboard;

function updateCheckoutMethod(method) {
    document.querySelectorAll('.pay-method-card').forEach(card => {
        const radio = card.querySelector('input[type="radio"]');
        if (radio && radio.value === method) {
            card.classList.add('active');
            radio.checked = true;
        } else {
            card.classList.remove('active');
        }
    });

    const detailsBox = document.getElementById('checkoutPaymentDetailsBox');
    if (!detailsBox) return;

    const pm = storePaymentMethods.find(m => m.key === method) || {};
    const price = Math.round((selectedCheckoutRank?.basePrice || 15000) * currentDiscountRate);
    const priceFormatted = `Rp ${price.toLocaleString('id-ID')}`;
    const color = pm.color || '#10b981';
    const account = pm.account || '';
    const instructions = pm.instructions || '';

    if (method === 'qris') {
        const qrUrl = account.startsWith('http') ? account : `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(account || 'HYROST_QRIS')}`;
        detailsBox.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; gap:6px; font-weight:800; color:${color}; margin-bottom:8px; font-size:0.9rem;">
                <i class="fas fa-qrcode"></i> ${escapeHTML(pm.name || 'QRIS')}
            </div>
            <div style="background:#fff; padding:10px; border-radius:14px; width:150px; margin:0 auto 10px; box-shadow:0 4px 15px rgba(0,0,0,0.5);">
                <img src="${escapeHTML(qrUrl)}" alt="QRIS Code" style="width:100%; display:block; border-radius:6px;" />
            </div>
            <div style="font-size:0.75rem; color:#9ca3af; margin-bottom:6px;">${escapeHTML(instructions)} Total: <strong style="color:#fff;">${priceFormatted}</strong></div>
        `;
    } else if (method.includes('_va')) {
        const bankName = method.split('_')[0].toUpperCase();
        const vaNum = account || '—';
        detailsBox.innerHTML = `
            <div style="font-weight:800; color:${color}; margin-bottom:8px; font-size:0.9rem;"><i class="fas fa-university"></i> ${escapeHTML(pm.name || `Virtual Account ${bankName}`)}</div>
            <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(0,0,0,0.6); border:1px dashed ${color}; padding:8px 14px; border-radius:12px; margin-bottom:8px;">
                <span style="font-family:monospace; font-size:1.2rem; font-weight:800; color:#fff;">${escapeHTML(vaNum)}</span>
                <button onclick="copyTextToClipboard('${escapeHTML(vaNum)}')" style="background:${color}; border:none; color:#000; padding:4px 10px; border-radius:6px; font-weight:800; font-size:0.75rem; cursor:pointer;">
                    <i class="fas fa-copy"></i> Salin
                </button>
            </div>
            <div style="font-size:0.75rem; color:#9ca3af; margin-bottom:4px;">${escapeHTML(instructions)} Transfer <strong style="color:#fff;">${priceFormatted}</strong>.</div>
        `;
    } else if (method === 'credit_card') {
        detailsBox.innerHTML = `
            <div style="font-weight:800; color:${color}; margin-bottom:6px; font-size:0.9rem;"><i class="fas fa-lock"></i> ${escapeHTML(pm.name || 'Kartu Kredit / Debit')}</div>
            <div style="font-size:0.75rem; color:#9ca3af; margin-bottom:8px;">${escapeHTML(account || instructions)}</div>
        `;
    } else if (method === 'indomaret' || method === 'alfamart') {
        const kodeBayar = account || `HYR-${Math.floor(100000000 + Math.random() * 900000000)}`;
        detailsBox.innerHTML = `
            <div style="font-weight:800; color:${color}; margin-bottom:8px; font-size:0.9rem;"><i class="fas fa-store"></i> ${escapeHTML(pm.name || 'Indomaret / Alfamart')}</div>
            <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(0,0,0,0.6); border:1px dashed ${color}; padding:8px 14px; border-radius:12px; margin-bottom:8px;">
                <span style="font-family:monospace; font-size:1.15rem; font-weight:800; color:#fff;">${escapeHTML(kodeBayar)}</span>
                <button onclick="copyTextToClipboard('${escapeHTML(kodeBayar)}')" style="background:${color}; border:none; color:#000; padding:4px 10px; border-radius:6px; font-weight:800; font-size:0.75rem; cursor:pointer;">
                    <i class="fas fa-copy"></i> Salin
                </button>
            </div>
            <div style="font-size:0.75rem; color:#9ca3af; margin-bottom:4px;">${escapeHTML(instructions)} Bayar <strong style="color:#fff;">${priceFormatted}</strong>.</div>
        `;
    } else {
        detailsBox.innerHTML = `
            <div style="font-weight:800; color:${color}; margin-bottom:8px; font-size:0.9rem;"><i class="fas ${escapeHTML(pm.icon || 'fa-credit-card')}"></i> ${escapeHTML(pm.name || method)}</div>
            <div style="font-size:0.85rem; color:#d1d5db; margin-bottom:8px; word-break:break-all;">${escapeHTML(account)}</div>
            <div style="font-size:0.75rem; color:#9ca3af;">${escapeHTML(instructions)}</div>
        `;
    }
}
window.updateCheckoutMethod = updateCheckoutMethod;

function applyStoreVoucher() {
    const input = document.getElementById('storeVoucherInput');
    const code = (input?.value || '').trim().toUpperCase();

    if (code === 'HYROST2026') {
        currentDiscountRate = 0.8;
        updateCheckoutPriceDisplay();
        showStoreToast("Kode promo HYROST2026 — diskon 20% diterapkan", 'success');
    } else if (code.length > 0) {
        showStoreToast('Kode promo tidak valid atau sudah kadaluwarsa', 'error');
    }
}
window.applyStoreVoucher = applyStoreVoucher;

// ── Midtrans Snap Loader for Store ──────────────────────────────────────────
let _storeSnapLoaded = false;
let _storeSnapLoading = false;

async function loadStoreSnapJs() {
    if (typeof window.snap !== 'undefined') {
        _storeSnapLoaded = true;
        return true;
    }
    if (_storeSnapLoaded) return true;
    if (_storeSnapLoading) {
        await new Promise(resolve => {
            let count = 0;
            const check = setInterval(() => {
                count++;
                if (_storeSnapLoaded || !_storeSnapLoading || count > 50) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
        return typeof window.snap !== 'undefined';
    }

    _storeSnapLoading = true;
    try {
        const res = await fetch('/api/studio/config');
        const data = await res.json();
        if (!data || !data.success || !data.midtrans?.enabled || !data.midtransClientKey) {
            _storeSnapLoading = false;
            return false;
        }

        return new Promise(resolve => {
            const script = document.createElement('script');
            script.src = data.snapJsUrl || (data.midtransIsProduction ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js');
            script.setAttribute('data-client-key', data.midtransClientKey);
            script.type = 'text/javascript';
            script.onload = () => { _storeSnapLoaded = true; _storeSnapLoading = false; resolve(true); };
            script.onerror = () => { _storeSnapLoaded = false; _storeSnapLoading = false; resolve(false); };
            document.head.appendChild(script);
        });
    } catch (_) {
        _storeSnapLoading = false;
        return false;
    }
}

async function processRankIDRPayment() {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return showStoreToast('Silakan login terlebih dahulu!', 'error');

    if (!selectedCheckoutRank) return;

    const btn = document.getElementById('btnConfirmPayIDR');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    }

    const selectedRadio = document.querySelector('input[name="payMethod"]:checked');
    const paymentMethod = selectedRadio ? selectedRadio.value : 'qris';
    const promoCode = document.getElementById('storeVoucherInput')?.value || '';

    // Load snap.js in background
    loadStoreSnapJs();

    try {
        const res = await fetch('/api/store/buy-rank-idr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                rankName: selectedCheckoutRank.rankName,
                paymentMethod,
                promoCode
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            closeRankCheckoutModal();

            // Jika ada token Midtrans Snap
            if (data.midtransToken) {
                await loadStoreSnapJs();
                if (typeof window.snap !== 'undefined' && typeof window.snap.pay === 'function') {
                    try {
                        window.snap.pay(data.midtransToken, {
                            onSuccess: function(result) {
                                showStoreResult({
                                    type: 'success',
                                    title: 'Pembayaran Berhasil!',
                                    message: `Selamat! Pembayaran Pangkat ${selectedCheckoutRank.rankName} telah lunas via Midtrans.`,
                                    transactionId: data.transactionId || data.orderCode,
                                    securityHash: data.securityHash || '',
                                    instructions: 'Ketik /claim di server Minecraft (In-Game) untuk menyinkronkan pangkat Anda.',
                                    onClose: () => window.location.reload(),
                                });
                            },
                            onPending: function(result) {
                                showStoreResult({
                                    type: 'pending',
                                    title: 'Menunggu Pembayaran',
                                    message: 'Selesaikan pembayaran sesuai petunjuk pada layar Midtrans.',
                                    transactionId: data.transactionId || data.orderCode,
                                    instructions: 'Setelah transfer lunas, pangkat akan otomatis diaktifkan.',
                                    onClose: () => window.location.reload(),
                                });
                            },
                            onError: function(result) {
                                showStoreToast('Pembayaran Midtrans gagal atau dibatalkan.', 'error');
                            },
                            onClose: function() {
                                showStoreToast('Jendela pembayaran ditutup. Kamu dapat melanjutkan kapan saja.', 'info');
                            }
                        });
                        return;
                    } catch (snapErr) {
                        console.warn('[store] Snap popup error, fallback to redirect:', snapErr);
                    }
                }

                // Fallback direct redirection
                if (data.redirectUrl) {
                    showStoreToast('Mengarahkan ke halaman pembayaran Midtrans...', 'info');
                    setTimeout(() => { window.location.href = data.redirectUrl; }, 600);
                    return;
                }
            }

            // Jika metode Tripay QRIS
            if (data.gateway === 'tripay' && data.qrUrl) {
                showStoreResult({
                    type: 'pending',
                    title: 'Scan QRIS Real-Time',
                    message: `<div style="text-align:center; margin:10px 0;"><img src="${data.qrUrl}" alt="QRIS" style="width:200px; height:200px; background:#fff; padding:8px; border-radius:10px; display:inline-block;" /><div style="margin-top:8px; font-weight:800; color:#34d399; font-size:1.2rem;">Rp ${data.amountIDR?.toLocaleString('id-ID')}</div><div style="font-size:0.78rem; color:#94a3b8;">Buka GoPay/DANA/BCA Mobile untuk scan QRIS</div></div>`,
                    transactionId: data.transactionId || data.orderCode,
                    securityHash: data.securityHash || '',
                    instructions: 'Pangkat akan otomatis aktif beberapa detik setelah pembayaran lunas.',
                    onClose: () => window.location.reload(),
                });
                return;
            }

            // Jika metode Transfer Manual
            if (data.gateway === 'manual') {
                const waButtonHtml = data.whatsappUrl 
                    ? `<div style="margin-top:14px;"><a href="${data.whatsappUrl}" target="_blank" class="btn btn-primary" style="background:#25d366; border:none; display:inline-flex; align-items:center; gap:8px; width:100%; justify-content:center; text-decoration:none;"><i class="fab fa-whatsapp"></i> Konfirmasi ke WhatsApp Admin</a></div>`
                    : '';
                const qrisImgHtml = data.qrisImage 
                    ? `<div style="text-align:center; margin:8px 0;"><img src="${data.qrisImage}" alt="QRIS Admin" style="width:160px; height:160px; background:#fff; padding:6px; border-radius:8px;" /></div>`
                    : '';

                showStoreResult({
                    type: 'pending',
                    title: 'Transfer Manual & QRIS',
                    message: `<div>
                        <div style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); border-radius:10px; padding:12px; text-align:center; margin-bottom:10px;">
                            <div style="font-size:0.75rem; color:#fde68a;">Nominal Transfer Tepat (Termasuk Kode Unik):</div>
                            <div style="font-size:1.4rem; font-weight:900; color:#fbbf24;">Rp ${data.amountIDR?.toLocaleString('id-ID')}</div>
                        </div>
                        ${qrisImgHtml}
                        <div style="font-size:0.82rem; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; margin-bottom:10px;">
                            <div><strong>Bank / E-Wallet:</strong> ${data.bankName || 'BCA / DANA'}</div>
                            <div><strong>No. Rekening / HP:</strong> <code style="color:#38bdf8;">${data.accountNumber || '-'}</code></div>
                            <div><strong>Atas Nama (A/N):</strong> ${data.accountName || 'Admin'}</div>
                        </div>
                        ${waButtonHtml}
                    </div>`,
                    transactionId: data.transactionId || data.orderCode,
                    securityHash: data.securityHash || '',
                    instructions: data.paymentInstructions || 'Transfer sesuai nominal tepat, lalu kirim bukti transfer.',
                    onClose: () => window.location.reload(),
                });
                return;
            }

            const isPending = data.requiresApproval && !data.midtransToken;
            const txId = data.transactionId || data.orderCode || '';
            const hash = data.securityHash || '';
            const instructions = data.instructions
                || data.paymentInstructions
                || 'Ketik /claim di server Minecraft (In-Game) untuk menyinkronkan pangkat Anda.';

            showStoreResult({
                type: isPending ? 'pending' : 'success',
                title: isPending ? 'Order Dibuat' : 'Pembayaran Berhasil',
                message: data.message || (isPending
                    ? 'Order pembayaran Anda telah dicatat. Menunggu konfirmasi.'
                    : 'Pangkat telah diaktifkan untuk akun Anda.'),
                transactionId: txId,
                securityHash: hash,
                instructions: instructions,
                onClose: () => window.location.reload(),
            });
        } else {
            showStoreResult({
                type: 'error',
                title: 'Pembayaran Gagal',
                message: data.message || 'Gagal memproses pembayaran.',
            });
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-lock"></i> Konfirmasi & Bayar Sekarang';
            }
        }
    } catch (e) {
        showStoreToast('Gagal menghubungkan ke server: ' + e.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-lock"></i> Konfirmasi & Bayar Sekarang';
        }
    }
}
window.processRankIDRPayment = processRankIDRPayment;

function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

window.buyRankWithGold = buyRankWithGold;
