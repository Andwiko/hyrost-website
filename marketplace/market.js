/* Hyrost Marketplace Logic */

const CART_KEY = 'hyrostCart';

document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    
    // Page specific initializations
    if (document.body.classList.contains('page-shop')) initShop();
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
    const productGrid = document.querySelector('.product-grid');
    if(!productGrid) return;
    
    // FETCH COSMETICS
    try {
        const res = await fetch('/api/public-cosmetics');
        if (res.ok) {
            const cosmetics = await res.json();
            cosmetics.forEach(item => {
                const card = document.createElement('div');
                card.className = 'product-card';
                
                // Visual Preview
                let visual = '';
                if (item.type === 'nametag') {
                    visual = `<span style="font-size:1.5rem; font-weight:bold; ${item.css_style}" class="${item.animation_data}">Username</span>`;
                } else if (item.type === 'badge') {
                    visual = `<i class="fas fa-certificate" style="font-size:3rem; ${item.css_style}"></i>`;
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
                
                // Cart Button (IDR Only or default?) - Keeping IDR/Generic for cart for now
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
                productGrid.prepend(card);
            });
        }
    } catch (e) { console.error(e); }

    // Global Buy Function
    window.buyItemNow = async (itemId, currency) => {
        const token = localStorage.getItem('hyrostToken');
        if(!token) return alert("Silakan login terlebih dahulu.");
        
        if(!confirm(`Beli item ini dengan koin ${currency}?`)) return;

        try {
            const res = await fetch('/api/store/buy-cosmetic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ itemId, currency })
            });
            const data = await res.json();
            if(res.ok) {
                alert("Berhasil! " + data.message);
                window.location.reload();
            } else {
                alert("Gagal: " + data.message);
            }
        } catch(e) { alert("Error connecting to server"); }
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

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Simulate processing
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
        btn.disabled = true;

        setTimeout(() => {
            showToast('Pembayaran Berhasil! Item dikirim ke inventory.');
            localStorage.removeItem(CART_KEY);
            setTimeout(() => {
                 window.location.href = 'shop.html';
            }, 2000);
        }, 1500);
    });
}

function initUpload() {
    const form = document.getElementById('uploadForm');
    
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

    form.addEventListener('submit', (e) => {
        e.preventDefault();
         // Simulate upload
        const btn = form.querySelector('button[type="submit"]');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengupload...';
        btn.disabled = true;

        setTimeout(() => {
            showToast('Item berhasil diupload untuk dijual!');
            setTimeout(() => {
                window.location.href = 'shop.html';
            }, 2000);
        }, 1500);
    });
}
