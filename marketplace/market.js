/* Hyrost Marketplace Logic */

const CART_KEY = 'hyrostCart';

document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    
    // Page specific initializations
    if (document.body.classList.contains('page-shop')) initShop();
    if (document.body.classList.contains('page-marketplace')) initMarketplaceIndex();
    if (document.body.classList.contains('page-cart')) initCart();
    if (document.body.classList.contains('page-checkout')) initCheckout();
    if (document.body.classList.contains('page-upload')) initUpload();
});

/* --- Global Cart Functions --- */

function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon} toast-icon"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
}

function addToCart(item) {
    const cart = getCart();
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        item.quantity = 1;
        cart.push(item);
    }
    saveCart(cart);
    showToast('Item berhasil ditambahkan ke keranjang!');
}

function updateCartBadge() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badges = document.querySelectorAll('.cart-count-badge');
    badges.forEach(b => {
        b.textContent = count;
        b.style.display = count > 0 ? 'inline-block' : 'none';
        b.style.background = count > 0 ? '#e98a22' : 'transparent';
    });
}

function formatRupiah(amount) {
    return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/* --- Page Specific Logic --- */

async function initShop() {
    const productGrid = document.getElementById('itemsGrid'); // specific ID
    const badgeGrid = document.getElementById('badgeShopGrid'); // specific ID
    
    // FETCH COSMETICS
    try {
        const res = await fetch('/api/public-cosmetics');
        if (res.ok) {
            const cosmetics = await res.json();
            
            // Clear filtering message if exists
            if(productGrid) productGrid.innerHTML = '';
            if(badgeGrid) badgeGrid.innerHTML = '';

            cosmetics.forEach(item => {
                // Style differences for Badge vs Item
                const isBadge = item.type === 'badge';
                const targetGrid = isBadge ? badgeGrid : productGrid;
                
                if (!targetGrid) return; // Skip if grid missing

                const card = document.createElement('div');
                card.className = isBadge ? 'badge-card' : 'product-card';
                
                // --- BADGE STYLE ---
                if (isBadge) {
                   card.innerHTML = `
                        <span class="badge-icon" style="color:${item.color || '#fff'}; ${item.css_style}"><i class="fas fa-certificate"></i></span>
                        <h3>${item.name}</h3>
                        <p style="color:#888; font-size:0.9rem;">${item.description || 'Badge Keren'}</p>
                        <h4 style="color:#e98a22; margin:10px 0;">
                            ${item.price_gold > 0 ? item.price_gold + ' Gold' : (item.price_idr > 0 ? 'Rp ' + item.price_idr.toLocaleString() : 'Free')}
                        </h4>
                        <button class="btn-action-market" style="width:100%; justify-content:center;" onclick="buyItemNow(${item.id}, 'gold')">Beli</button>
                   `;
                } 
                // --- ITEM/NAMETAG STYLE ---
                else {
                    let visual = '';
                    if (item.type === 'nametag') {
                        visual = `<span style="font-size:1.5rem; font-weight:bold; ${item.css_style}" class="${item.animation_data}">Username</span>`;
                    } else {
                        visual = `<div style="border:2px solid #888; padding:5px 15px; border-radius:10px; ${item.css_style}">Username</div>`;
                    }

                    // Price Blocks
                    let priceHtml = '<div class="product-prices" style="display:flex; flex-direction:column; gap:5px; margin-bottom:10px;">';
                    if(item.price_bronze > 0) priceHtml += `<div style="color:#cd7f32"><i class="fas fa-coins"></i> ${item.price_bronze} Bronze</div>`;
                    if(item.price_silver > 0) priceHtml += `<div style="color:#c0c0c0"><i class="fas fa-coins"></i> ${item.price_silver} Silver</div>`;
                    if(item.price_gold > 0) priceHtml += `<div style="color:#ffd700"><i class="fas fa-coins"></i> ${item.price_gold} Gold</div>`;
                    if(item.price_idr > 0) priceHtml += `<div style="color:#aaa; font-size:0.9rem;">IDR ${formatRupiah(item.price_idr)}</div>`;
                    priceHtml += '</div>';

                    // Buy Buttons
                    let buttonsHtml = '';
                    if(item.price_bronze > 0) buttonsHtml += `<button class="btn-buy-now" style="background:#cd7f32; margin-bottom:5px;" onclick="buyItemNow(${item.id}, 'bronze')">Beli (Bronze)</button>`;
                    if(item.price_silver > 0) buttonsHtml += `<button class="btn-buy-now" style="background:#c0c0c0; color:#000; margin-bottom:5px;" onclick="buyItemNow(${item.id}, 'silver')">Beli (Silver)</button>`;
                    if(item.price_gold > 0) buttonsHtml += `<button class="btn-buy-now" style="background:#ffd700; color:#000; margin-bottom:5px;" onclick="buyItemNow(${item.id}, 'gold')">Beli (Gold)</button>`;
                    
                    if(item.price_idr > 0) buttonsHtml += `<button class="btn-add-cart" data-id="cos-${item.id}" data-name="${item.name}" data-price="${item.price_idr}" data-image="">+ Keranjang (IDR)</button>`;

                    card.innerHTML = `
                        <div class="product-image" style="display:flex; align-items:center; justify-content:center; background:#111;">
                            ${visual}
                        </div>
                        <div class="product-info">
                            <h3>${item.name}</h3>
                            <p>${item.description || 'Item kosmetik eksklusif.'}</p>
                            ${priceHtml}
                            <div style="display:flex; flex-direction:column;">
                                ${buttonsHtml}
                            </div>
                        </div>
                    `;
                }
                
                targetGrid.prepend(card);
            });

            if (cosmetics.length === 0) {
                showEmptyShopState(productGrid, badgeGrid);
            }
        } else {
            showEmptyShopState(productGrid, badgeGrid);
        }
    } catch (e) {
        console.error(e);
        showEmptyShopState(productGrid, badgeGrid);
    }

    // Global Buy Function
    window.buyItemNow = async (itemId, currency) => {
        const token = localStorage.getItem('hyrostToken');
        if(!token) return showToast("Silakan login terlebih dahulu.", "error");
        
        if(!confirm(`Beli item ini dengan koin ${currency}?`)) return;

        try {
            const res = await fetch('/api/store/buy-cosmetic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ itemId, currency })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Berhasil! " + (data.message || "Item telah ditambahkan ke inventaris."), "success");
                setTimeout(() => location.reload(), 1000);
                return;
            }
            showToast(data.message || "Pembelian gagal.", "error");
        } catch(e) {
            showToast("Gagal menghubungi server.", "error");
        }
    };

    // Add event listeners to "Add to Cart" buttons
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.btn-add-cart')) {
            const btn = e.target.closest('.btn-add-cart');
            const item = {
                id: btn.dataset.id,
                name: btn.dataset.name,
                price: parseInt(btn.dataset.price), // Using IDR for cart login for now
                image: btn.dataset.image
            };
            addToCart(item);
            
            // Animation for button
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Ditambahkan';
            btn.style.background = 'var(--accent-orange)';
            btn.style.color = 'white';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.style.color = '';
            }, 1000);
        }
    });
}

function initCart() {
    const cartContainer = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const emptyMsg = document.getElementById('emptyCartMsg');
    const checkoutBtn = document.getElementById('btnCheckout');
    
    function renderCart() {
        const cart = getCart();
        cartContainer.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            emptyMsg.style.display = 'block';
            checkoutBtn.style.display = 'none';
            totalEl.classList.remove('active'); // Hide total if needed or just 0
            totalEl.textContent = formatRupiah(0);
            return;
        }

        emptyMsg.style.display = 'none';
        checkoutBtn.style.display = 'inline-block';

        cart.forEach((item, index) => {
            total += item.price * item.quantity;
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p class="price">${formatRupiah(item.price)}</p>
                </div>
                <div class="item-actions">
                    <button onclick="changeQuantity(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQuantity(${index}, 1)">+</button>
                    <button class="btn-remove" onclick="window.removeCartItem(${index})"><i class="fas fa-trash"></i></button>
                </div>
            `;
            cartContainer.appendChild(itemEl);
        });
        totalEl.textContent = formatRupiah(total);
    }

    // Expose helpers globally for inline onclicks
    window.changeQuantity = (index, delta) => {
        const cart = getCart();
        cart[index].quantity += delta;
        if (cart[index].quantity < 1) cart[index].quantity = 1;
        saveCart(cart);
        renderCart();
    };

    window.removeCartItem = (index) => {
        if(confirm('Hapus item ini dari keranjang?')) {
            const cart = getCart();
            cart.splice(index, 1);
            saveCart(cart);
            renderCart();
            showToast('Item dihapus dari keranjang.');
        }
    };

    renderCart();
}

function initCheckout() {
    const summaryList = document.getElementById('summaryList');
    const totalEl = document.getElementById('checkoutTotal');
    const form = document.getElementById('checkoutForm');
    
    const cart = getCart();
    if (cart.length === 0) {
        window.location.href = 'shop.html';
        return;
    }

    let total = 0;
    cart.forEach(item => {
        total += item.price * item.quantity;
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.name} x${item.quantity}</span> <span>${formatRupiah(item.price * item.quantity)}</span>`;
        summaryList.appendChild(li);
    });
    totalEl.textContent = formatRupiah(total);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
        btn.disabled = true;

        const token = localStorage.getItem('hyrostToken');
        if (!token) {
            showToast('Silakan login terlebih dahulu.', 'error');
            btn.textContent = originalText;
            btn.disabled = false;
            return;
        }

        showToast('Checkout IDR memerlukan gateway pembayaran. Gunakan pembelian koin di toko kosmetik.', 'error');
        btn.textContent = originalText;
        btn.disabled = false;
    });
}

async function loadPluginCatalogForUpload() {
    const select = document.getElementById('catalogItemCode');
    if (!select) return;

    try {
        const res = await fetch('/api/plugin/catalog');
        if (!res.ok) return;
        const data = await res.json();
        (data.items || []).forEach((item) => {
            const opt = document.createElement('option');
            opt.value = item.item_code;
            opt.textContent = `${item.name} (${item.item_code})`;
            opt.dataset.name = item.name;
            opt.dataset.type = item.item_type;
            select.appendChild(opt);
        });

        select.addEventListener('change', () => {
            const selected = select.options[select.selectedIndex];
            if (!selected || !selected.value) return;
            const nameInput = document.getElementById('itemName');
            const typeInput = document.getElementById('itemType');
            if (nameInput && selected.dataset.name) nameInput.value = selected.dataset.name;
            if (typeInput && selected.dataset.type) typeInput.value = selected.dataset.type;
        });
    } catch (e) {
        console.warn('Plugin catalog unavailable:', e.message);
    }
}

function initUpload() {
    const form = document.getElementById('uploadForm');
    loadPluginCatalogForUpload();
    
    // File input preview logic
    const fileInput = document.getElementById('fileInput');
    const uploadLabel = document.querySelector('.upload-label');
    
    if(fileInput && uploadLabel) {
        fileInput.addEventListener('change', (e) => {
            if(e.target.files.length > 0) {
                const fileName = e.target.files[0].name;
                uploadLabel.innerHTML = `<i class="fas fa-check"></i> <span>${fileName}</span>`;
                uploadLabel.style.borderColor = 'var(--accent-orange)';
                uploadLabel.style.color = 'var(--accent-orange)';
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengupload...';
        btn.disabled = true;

        const token = localStorage.getItem('hyrostToken');
        if (!token) {
            showToast('Silakan login terlebih dahulu.', 'error');
            btn.disabled = false;
            btn.textContent = 'Publikasikan Listing';
            return;
        }

        const itemName = document.getElementById('itemName')?.value?.trim();
        const itemDesc = document.getElementById('itemDesc')?.value?.trim() || '';
        const itemPrice = parseInt(document.getElementById('itemPrice')?.value || '0', 10);
        const priceType = document.getElementById('priceType')?.value || 'bronze';
        const itemType = document.getElementById('itemType')?.value || 'general';

        if (!itemName || !itemPrice) {
            showToast('Nama item dan harga wajib diisi.', 'error');
            btn.disabled = false;
            btn.textContent = 'Publikasikan Listing';
            return;
        }

        const catalogItemCode = document.getElementById('catalogItemCode')?.value || null;

        try {
            const res = await fetch('/api/marketplace/listings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    itemName,
                    description: itemDesc,
                    priceCoin: itemPrice,
                    priceType,
                    itemType,
                    catalogItemCode,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Listing berhasil dipublikasikan!');
                setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            } else {
                showToast(data.message || 'Gagal mempublish listing.', 'error');
                btn.disabled = false;
                btn.textContent = 'Publikasikan Listing';
            }
        } catch (err) {
            showToast('Gagal menghubungi server.', 'error');
            btn.disabled = false;
            btn.textContent = 'Publikasikan Listing';
        }
    });
}

function showEmptyShopState(productGrid, badgeGrid) {
    const emptyHtml = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#9ca3af;">
        <i class="fas fa-store" style="font-size:2.5rem;margin-bottom:12px;color:#6366f1;"></i>
        <p>Belum ada item di toko. Admin dapat menambahkan kosmetik melalui Admin Panel.</p>
    </div>`;
    if (productGrid) productGrid.innerHTML = emptyHtml;
    if (badgeGrid) badgeGrid.innerHTML = '';
}

async function initMarketplaceIndex() {
    const grid = document.getElementById('marketplaceListingsGrid');
    if (!grid) return;

    try {
        const res = await fetch('/api/marketplace/listings');
        if (!res.ok) throw new Error('Failed to load');
        const listings = await res.json();
        grid.innerHTML = '';

        if (!listings.length) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#9ca3af;">
                <i class="fas fa-box-open" style="font-size:2.5rem;margin-bottom:12px;color:#6366f1;"></i>
                <p>Belum ada listing dari user. <a href="upload.html" style="color:#6366f1;">Jual item pertama Anda</a></p>
            </div>`;
            return;
        }

        const coinColors = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700' };

        listings.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'widget-card';
            card.innerHTML = `
                <div class="widget-title" style="color: var(--accent-indigo);">
                    <i class="fas fa-tag"></i>
                    <span>${item.item_name}</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">${item.description || 'Listing dari user'}</p>
                <p style="font-size: 0.78rem; color: #888; margin-bottom: 12px;">Penjual: <strong>${item.seller_name}</strong></p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; color: ${coinColors[item.price_type] || '#ffd700'};">${item.price_coin} ${item.price_type}</span>
                    <button class="btn-header-action buy-listing-btn" data-id="${item.id}" style="background: var(--accent-cyan); color:#000; font-weight:800;">Beli</button>
                </div>
            `;
            grid.appendChild(card);
        });

        grid.addEventListener('click', async (e) => {
            const btn = e.target.closest('.buy-listing-btn');
            if (!btn) return;
            const token = localStorage.getItem('hyrostToken');
            if (!token) return showToast('Silakan login terlebih dahulu.', 'error');
            if (!confirm('Beli item ini?')) return;

            try {
                const res = await fetch(`/api/marketplace/listings/${btn.dataset.id}/buy`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(data.message || 'Pembelian berhasil!');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showToast(data.message || 'Pembelian gagal.', 'error');
                }
            } catch (err) {
                showToast('Gagal menghubungi server.', 'error');
            }
        });
    } catch (e) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#ef4444;">Gagal memuat marketplace.</div>`;
    }
}
