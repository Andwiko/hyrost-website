document.addEventListener('DOMContentLoaded', () => {

    // --- LOGIKA LOADING SCREEN ---
    const loadingScreen = document.getElementById('loading-screen');

    // Tambahkan delay kecil agar animasi loading terlihat
    // Ubah nilai 1000 (1 detik) jika ingin lebih lama atau lebih cepat
    setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
        }
    }, 1000); // Waktu delay 1 detik

    // --- LOGIKA SIDEBAR MOBILE ---
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target) && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }

    // --- DATA PRODUK ---
    const products = [
        { id: 1, name: 'Diamond Sword', category: 'weapon', price: 50000, image: '/assets/images/icon/diamond_sword.png' },
        { id: 2, name: 'Diamond Pickaxe', category: 'tools', price: 45000, image: '/assets/images/icon/diamond_pickaxe.png' },
        { id: 3, name: 'Oak Log', category: 'natural', price: 500, image: '/assets/images/icon/oak_log.png' },
        { id: 4, name: 'Apple', category: 'food', price: 200, image: '/assets/images/icon/apple.png' },
        { id: 5, name: 'Iron Ingot', category: 'ingredients', price: 1500, image: '/assets/images/icon/iron_ingot.png' },
        { id: 6, name: 'Stone Bricks', category: 'building', price: 1000, image: '/assets/images/icon/stone_bricks.png' },
        { id: 7, name: 'Blue Wool', category: 'colored', price: 800, image: '/assets/images/icon/blue_wool.png' },
        { id: 8, name: 'Bow', category: 'weapon', price: 25000, image: '/assets/images/icon/bow.png' },
    ];

    // --- ELEMEN DOM ---
    const productContainer = document.getElementById('product-container');
    const cartCountElement = document.getElementById('cart-count');
    const categoryLinks = document.querySelectorAll('nav a[data-category]');

    // --- FUNGSI UTAMA ---

    // Menampilkan produk ke halaman
    function displayProducts(productsToShow) {
        if (!productContainer) return; // Pastikan elemen ada sebelum melanjutkan
        productContainer.innerHTML = ''; 
        if (productsToShow.length === 0) {
            productContainer.innerHTML = '<p>Tidak ada produk di kategori ini.</p>';
            return;
        }
        productsToShow.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="price">Rp ${product.price.toLocaleString('id-ID')}</p>
                <button class="btn btn-primary" onclick="addToCart(${product.id}, '${product.name}', ${product.price})">Tambah ke Keranjang</button>
            `;
            productContainer.appendChild(productCard);
        });
    }

    // --- FUNGSI PENGELOLA KERANANG (GLOBAL) ---

    // Menambahkan produk ke keranjang (localStorage)
    window.addToCart = function(id, name, price) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingProductIndex = cart.findIndex(item => item.id === id);

        if (existingProductIndex > -1) {
            cart[existingProductIndex].quantity += 1;
        } else {
            cart.push({ id, name, price, quantity: 1 });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        alert(`"${name}" telah ditambahkan ke keranjang!`);
    };

    // Memperbarui angka di ikon keranjang
    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        if (cartCountElement) {
            cartCountElement.textContent = totalItems;
        }
    }

    // Fungsi untuk menghapus item dari keranjang
    window.removeFromCart = function(id) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        cart = cart.filter(item => item.id !== id);
        
        localStorage.setItem('cart', JSON.stringify(cart));
        
        if (typeof renderCart === 'function') {
            renderCart();
        }
        updateCartCount();
    };

    // Filter produk berdasarkan kategori
    function filterProducts(category, allProducts) {
        categoryLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`nav a[data-category="${category}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        if (category === 'all') {
            displayProducts(allProducts);
        } else {
            const filteredProducts = allProducts.filter(p => p.category === category);
            displayProducts(filteredProducts);
        }
    }
    
    // --- EVENT LISTENER UNTUK HALAMAN SHOP ---
    if (productContainer) {
        const userProducts = JSON.parse(localStorage.getItem('userProducts')) || [];
        const allProducts = [...products, ...userProducts];

        displayProducts(allProducts);
        updateCartCount();

        categoryLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = e.target.getAttribute('data-category');
                
                // Toggle Submenu Logic
                const parentItem = link.closest('.nav-item');
                const sublist = parentItem.querySelector('.nav-sublist');
                
                // Close other open submenus (optional, nice for UI)
                document.querySelectorAll('.nav-sublist.open').forEach(list => {
                    if (list !== sublist) list.classList.remove('open');
                });

                if (sublist) {
                    sublist.classList.toggle('open');
                }

                // Filter products
                filterProducts(category, allProducts);
            });
        });
    }

    // --- LOGIKA UNTUK HALAMAN CART ---
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartTotalElement = document.getElementById('cart-total');

    if (cartItemsContainer) {
        function renderCart() {
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            cartItemsContainer.innerHTML = '';
            let totalPrice = 0;

            if (cart.length === 0) {
                cartItemsContainer.innerHTML = '<p>Keranjang Anda kosong.</p>';
                cartTotalElement.textContent = 'Rp 0';
                return;
            }

            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                totalPrice += itemTotal;

                const cartItemElement = document.createElement('div');
                cartItemElement.className = 'cart-item';
                cartItemElement.innerHTML = `
                    <div>
                        <strong>${item.name}</strong> (x${item.quantity})
                    </div>
                    <div>
                        <span>Rp ${itemTotal.toLocaleString('id-ID')}</span>
                        <button class="btn btn-danger" onclick="removeFromCart(${item.id})" style="margin-left: 10px;">Hapus</button>
                    </div>
                `;
                cartItemsContainer.appendChild(cartItemElement);
            });

            cartTotalElement.textContent = `Rp ${totalPrice.toLocaleString('id-ID')}`;
        }

        renderCart();
        updateCartCount();
    }

    // --- LOGIKA UNTUK HALAMAN CHECKOUT ---
    const checkoutForm = document.getElementById('checkout-form');
    const orderItemsContainer = document.getElementById('order-items');
    const orderTotalElement = document.getElementById('order-total');

    if (checkoutForm) {
        function renderOrderSummary() {
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            orderItemsContainer.innerHTML = '';
            let totalPrice = 0;

            if (cart.length === 0) {
                orderItemsContainer.innerHTML = '<p>Tidak ada item dalam pesanan.</p>';
                orderTotalElement.textContent = 'Rp 0';
                document.querySelector('.btn-success').disabled = true;
                return;
            }

            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                totalPrice += itemTotal;
                const orderItemElement = document.createElement('p');
                orderItemElement.textContent = `${item.name} (x${item.quantity}) - Rp ${itemTotal.toLocaleString('id-ID')}`;
                orderItemsContainer.appendChild(orderItemElement);
            });

            orderTotalElement.textContent = `Rp ${totalPrice.toLocaleString('id-ID')}`;
        }

        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Terima kasih! Pesanan Anda telah diterima. Kami akan memprosesnya segera.');
            localStorage.removeItem('cart');
            window.location.href = '/marketplace/shop.html';
        });

        renderOrderSummary();
    }
    
    // --- LOGIKA UNTUK HALAMAN UPLOAD (BARU DITAMBAHKAN) ---
    const uploadForm = document.getElementById('upload-form');

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Ambil elemen untuk menampilkan pesan
            const messageDiv = document.createElement('div');
            messageDiv.style.marginTop = '1rem';
            messageDiv.style.textAlign = 'center';
            messageDiv.style.fontWeight = '600';
            uploadForm.appendChild(messageDiv);

            // Buat FormData dari form
            const formData = new FormData(uploadForm);

            try {
                // Ganti URL dengan URL backend Anda
                const response = await fetch('http://localhost:5000/api/products', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    messageDiv.textContent = 'Item berhasil diupload!';
                    messageDiv.style.color = 'green';
                    
                    uploadForm.reset();

                    setTimeout(() => {
                        window.location.href = '/marketplace/shop.html';
                    }, 2000);

                } else {
                    throw new Error(result.message || 'Gagal mengupload item');
                }

            } catch (error) {
                console.error('Error:', error);
                messageDiv.textContent = `Error: ${error.message}`;
                messageDiv.style.color = 'red';
            }
        });
    }
    
});