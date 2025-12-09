document.addEventListener('DOMContentLoaded', () => {
    // ========== ELEMEN DOM ==========
    const hamburger = document.getElementById('hamburger');
    const navLinksContainer = document.getElementById('navLinksContainer');
    const navLinks = document.querySelectorAll('.nav-link');
    const modal = document.getElementById('modal');
    const modalClose = document.querySelector('.modal-close');
    const navbar = document.querySelector('.navbar');
    const statusForm = document.getElementById('statusForm');
    const statusContent = document.getElementById('statusContent');
    const statusFeed = document.getElementById('statusFeed');
    const sections = document.querySelectorAll('section[id]');

    // ========== AUTH ELEMENTS ==========
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');

    // ========== AUTH FUNCTIONS (Client-Side Simulation) ==========
    function register(username, password) {
        const users = JSON.parse(localStorage.getItem('hyrostUsers')) || [];
        if (users.find(user => user.username === username)) {
            return { success: false, message: 'Username sudah ada.' };
        }
        users.push({ username, password });
        localStorage.setItem('hyrostUsers', JSON.stringify(users));
        return { success: true, message: 'Pendaftaran berhasil! Silakan login.' };
    }

    function login(username, password) {
        const users = JSON.parse(localStorage.getItem('hyrostUsers')) || [];
        const user = users.find(user => user.username === username && user.password === password);
        if (user) {
            localStorage.setItem('hyrostCurrentUser', JSON.stringify(user));
            return { success: true, message: 'Login berhasil!' };
        }
        return { success: false, message: 'Username atau password salah.' };
    }

    function logout() {
        localStorage.removeItem('hyrostCurrentUser');
    }

    function isLoggedIn() {
        return localStorage.getItem('hyrostCurrentUser') !== null;
    }

    function getCurrentUser() {
        return JSON.parse(localStorage.getItem('hyrostCurrentUser'));
    }
    
    // ========== AUTH UI LOGIC ==========
    function updateAuthUI() {
        if (isLoggedIn()) {
            const user = getCurrentUser();
            console.log(`Selamat datang kembali, ${user.username}!`);
            if(loginFormContainer) loginFormContainer.style.display = 'none';
            if(registerFormContainer) registerFormContainer.style.display = 'none';
        } else {
            console.log('Anda belum login.');
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = loginForm.querySelector('#login-username').value.trim();
            const password = loginForm.querySelector('#login-password').value.trim();
            const result = login(username, password);
            alert(result.message);
            if (result.success) {
                loginForm.reset();
                updateAuthUI();
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = registerForm.querySelector('#register-username').value.trim();
            const password = registerForm.querySelector('#register-password').value.trim();
            const result = register(username, password);
            alert(result.message);
            if (result.success) {
                registerForm.reset();
                if(showLoginLink) showLoginLink.click(); // Switch to login form
                updateAuthUI();
            }
        });
    }
    
    if(showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            if(loginFormContainer) loginFormContainer.style.display = 'none';
            if(registerFormContainer) registerFormContainer.style.display = 'block';
        });
    }

    if(showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            if(registerFormContainer) registerFormContainer.style.display = 'none';
            if(loginFormContainer) loginFormContainer.style.display = 'block';
        });
    }

    updateAuthUI();

    // ========== MOBILE MENU TOGGLE ==========
    if (hamburger && navLinksContainer) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinksContainer.classList.toggle('active');
        });
    }

    if (navLinks) {
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinksContainer.classList.remove('active');
            });
        });
    }

    // ========== SMOOTH SCROLLING ==========
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });

    // ========== MODAL FUNCTIONALITY ==========
    const watchButtons = document.querySelectorAll('.btn-secondary');
    if (modal && modalClose) {
        watchButtons.forEach(button => {
            if (button.textContent.includes('WATCH')) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    modal.style.display = 'block';
                    document.body.style.overflow = 'hidden';
                });
            }
        });

        modalClose.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }

    // ========== JOIN NOW BUTTON ==========
    const joinButtons = document.querySelectorAll('.btn-primary');
    joinButtons.forEach(button => {
        if (button.textContent.includes('JOIN NOW')) {
            button.addEventListener('click', () => {
                alert('Terima kasih atas minat Anda! Halaman pendaftaran akan segera hadir.');
            });
        }
    });

    // ========== SCROLL-BASED EFFECTS ==========
    if (navbar || sections.length > 0) {
        window.addEventListener('scroll', () => {
            const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
            
            // --- TUTUP MENU MOBILE SAAT SCROLL ---
            // Jika menu mobile sedang aktif, tutup saat halaman di-scroll
            if (navLinksContainer && navLinksContainer.classList.contains('active')) {
                hamburger.classList.remove('active');
                navLinksContainer.classList.remove('active');
            }
            
            // Navbar shadow effect
            if(navbar) {
                if (scrollPosition > 100) {
                    navbar.style.boxShadow = '0 4px 20px rgba(212, 175, 55, 0.2)';
                } else {
                    navbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
                }
            }

            // Dynamic scroll highlight for nav
            if (sections.length > 0 && navLinks.length > 0) {
                const currentScroll = scrollPosition + 100;
                sections.forEach(section => {
                    const sectionTop = section.offsetTop;
                    const sectionHeight = section.offsetHeight;

                    if (currentScroll >= sectionTop && currentScroll < sectionTop + sectionHeight) {
                        navLinks.forEach(link => {
                            link.classList.remove('active');
                            link.style.color = '#f5e6d3'; // Reset color
                            if (link.getAttribute('href') === `#${section.id}`) {
                                link.classList.add('active');
                                link.style.color = '#d4af37'; // Highlight color
                            }
                        });
                    }
                });
            }
        });
    }

    // ========== PARALLAX EFFECT ==========
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', () => {
            const scrollPosition = window.pageYOffset;
            hero.style.transform = `translateY(${scrollPosition * 0.5}px)`;
        });
    }

    // ========== INTERSECTION OBSERVER FOR ANIMATIONS ==========
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    const cards = document.querySelectorAll('.feature-card, .update-card, .social-link');
    if (cards.length > 0) {
        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.6s ease-out';
            observer.observe(card);
        });
    }

    // ========== BLOG & STATUS FUNCTIONALITY ==========
    function saveStatusToLocalStorage(content) {
        const statuses = JSON.parse(localStorage.getItem('hyrostStatuses')) || [];
        const newStatus = {
            id: Date.now(),
            content: content,
            date: new Date().toLocaleString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        };
        statuses.unshift(newStatus);
        localStorage.setItem('hyrostStatuses', JSON.stringify(statuses));
    }

    function renderStatuses() {
        if (!statusFeed) return;
        
        const statuses = JSON.parse(localStorage.getItem('hyrostStatuses')) || [];
        if (statuses.length === 0) {
            statusFeed.innerHTML = '<p style="text-align: center; color: rgba(245, 230, 211, 0.5);">Belum ada status. Jadilah yang pertama!</p>';
            return;
        }

        statusFeed.innerHTML = '';
        statuses.forEach(status => {
            const statusElement = document.createElement('div');
            statusElement.className = 'status-item';
            statusElement.innerHTML = `
                <p>${status.content}</p>
                <div class="status-meta">
                    <span class="status-date">${status.date}</span>
                    <button class="delete-status" data-id="${status.id}">Hapus</button>
                </div>
            `;
            statusFeed.appendChild(statusElement);
        });

        document.querySelectorAll('.delete-status').forEach(button => {
            button.addEventListener('click', function() { deleteStatus(this.getAttribute('data-id')); });
        });
    }

    function deleteStatus(id) {
        if (confirm('Apakah Anda yakin ingin menghapus status ini?')) {
            let statuses = JSON.parse(localStorage.getItem('hyrostStatuses')) || [];
            statuses = statuses.filter(status => status.id != id);
            localStorage.setItem('hyrostStatuses', JSON.stringify(statuses));
            renderStatuses();
        }
    }

    if (statusForm && statusContent) {
        statusForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const content = statusContent.value.trim();
            if (content) {
                saveStatusToLocalStorage(content);
                statusContent.value = '';
                renderStatuses();
            }
        });
        renderStatuses();
    }

    // ========== READ MORE & BLOG LINKS ==========
    const readMoreLinks = document.querySelectorAll('.read-more');
    if (readMoreLinks) {
        readMoreLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Halaman blog akan segera hadir!');
            });
        });
    }
    
    const blogLinks = document.querySelectorAll('.blog-link');
    if (blogLinks) {
        blogLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Bagian blog akan segera hadir!');
            });
        });
    }

    // ========== CONSOLE MESSAGE ==========
    console.log('%c Selamat datang di Hyrost! ', 'background: linear-gradient(135deg, #d4af37, #f0d787); color: #1a0f0a; font-size: 16px; padding: 10px; border-radius: 5px;');
    console.log('%c Dunia Petualangan dan Kreativitas ', 'color: #d4af37; font-size: 14px; font-weight: bold;');
});