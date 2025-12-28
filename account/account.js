/* Account Page Logic */
import { updateProfile } from '../auth.js?v=2';

console.log("DEBUG: Account Script Loaded");

// Initialize
function init() {
    console.log("DEBUG: Init running check...");
    loadUserProfile();
    setupEventListeners();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DEBUG: DOMContentLoaded fired");
        init();
    });
} else {
    console.log("DEBUG: DOM already ready");
    init();
}

    // Expose to window for HTML onclicks
    window.handleAvatarChange = handleAvatarChange;
    // Admin & UI Functions
    window.openAdminModal = openAdminModal;
    window.closeAdminModal = closeAdminModal;
    window.createNewRole = createNewRole;
    window.assignRoleToUser = assignRoleToUser;

    async function loadUserProfile() {
        console.log("DEBUG: Loading User Profile...");
        
        // Define UI Elements inside function scope so try/catch can see them
        const bannerAvatar = document.getElementById('bannerAvatar');
        const bannerUsername = document.getElementById('bannerUsername');
        const displayUser = document.getElementById('displayUsername');
            
        const token = localStorage.getItem('hyrostToken');
        if (!token) {
            window.location.href = '../auth/login.html'; // No token? Go to login
            return; 
        }

        try {
            // Fetch fresh data from API
            const res = await fetch('/api/users/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.status === 401) {
                throw new Error("401 Unauthorized");
            }
            if (!res.ok) throw new Error("Failed to fetch profile");

            const userData = await res.json();
            
            // ... (rest of processing) ...
            
            // UI Update Logic (Simplified for replacement context)
            const user = {
                username: userData.username,
                email: userData.email,
                role: userData.role,
                avatarUrl: userData.avatarUrl,
                createdAt: userData.createdAt
            };
            localStorage.setItem('currentUser', JSON.stringify(user));

            // Elements
            const bannerEmail = document.getElementById('bannerEmail');
            const bannerJoinDate = document.getElementById('bannerJoinDate');
            const displayEmail = document.getElementById('displayEmail');
            const displayRole = document.getElementById('displayRole');
            const displayCreatedAt = document.getElementById('displayCreatedAt');
            const coinBronze = document.getElementById('coinBronze');
            const coinSilver = document.getElementById('coinSilver');
            const coinGold = document.getElementById('coinGold');
            const inputUser = document.getElementById('username');
            const inputEmail = document.getElementById('email');

            // Format Date
            const dateStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-';

            // Updates
            if (bannerUsername) bannerUsername.textContent = user.username;
            if (bannerEmail) bannerEmail.textContent = user.email;
            if (bannerJoinDate) bannerJoinDate.textContent = dateStr;
            if (displayUser) displayUser.textContent = user.username;
            if (displayEmail) displayEmail.textContent = user.email;
            if (displayRole) displayRole.textContent = user.role;
            if (displayCreatedAt) displayCreatedAt.textContent = dateStr;
            if (inputUser) inputUser.value = user.username;
            if (inputEmail) inputEmail.value = user.email;

            // Update Coins
            if (userData.coins) {
                if (coinBronze) coinBronze.textContent = userData.coins.bronze || 0;
                if (coinSilver) coinSilver.textContent = userData.coins.silver || 0;
                if (coinGold) coinGold.textContent = userData.coins.gold || 0;
            }

            // Update Avatar
            const avatarSrc = user.avatarUrl || `https://cravatar.eu/avatar/${user.username}/128.png`;
            if (bannerAvatar) bannerAvatar.src = avatarSrc;
            const sidebarAvatar = document.getElementById('userAvatar');
            if (sidebarAvatar) sidebarAvatar.src = user.avatarUrl || `https://cravatar.eu/avatar/${user.username}/64.png`;

            loadActivities();

            const adminBtn = document.getElementById('adminPanelBtnContainer');
            if (adminBtn) {
                if (user.role && user.role.toLowerCase() === 'admin') adminBtn.style.display = 'block';
                else adminBtn.style.display = 'none';
            }

        } catch (err) {
            console.error("Profile Load Error:", err);
            
            if (bannerUsername) bannerUsername.textContent = "Session Expired";
            if (displayUser) displayUser.textContent = "Relogin Required";
            
            // Handle 401 specifically
             if (err.message.includes("401")) {
                 console.warn("Token invalid. Clearing and redirecting.");
                 localStorage.removeItem('hyrostToken');
                 localStorage.removeItem('currentUser');
                 alert("Sesi Anda telah berakhir. Silakan login kembali.");
                 window.location.href = '../auth/login.html';
             }
        }
    }

    async function loadActivities() {
        const container = document.getElementById('activityLogsContainer');
        if (!container) return;
        
        const token = localStorage.getItem('hyrostToken');
        try {
            const res = await fetch('/api/users/activities', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const logs = await res.json();
            
            if (logs.length === 0) {
                container.innerHTML = '<p class="text-muted">No recent activity.</p>';
                return;
            }
            
            let html = '<ul class="activity-list">';
            logs.forEach(log => {
                const date = new Date(log.created_at).toLocaleDateString() + ' ' + new Date(log.created_at).toLocaleTimeString();
                html += `
                    <li>
                        <div class="act-icon"><i class="fas fa-history"></i></div>
                        <div class="act-details">
                            <span class="act-action">${log.action}</span>
                            <span class="act-desc">${log.details}</span>
                            <span class="act-time">${date}</span>
                        </div>
                    </li>
                `;
            });
            html += '</ul>';
            container.innerHTML = html;

        } catch (err) {
            container.innerHTML = '<p class="text-danger">Failed to load activity.</p>';
        }
    }

    // --- Admin Logic ---
    function openAdminModal() {
        document.getElementById('adminModal').classList.add('active');
        loadRoles();
        loadUsersForAdmin();
    }

    function closeAdminModal() {
        document.getElementById('adminModal').classList.remove('active');
    }

    async function createNewRole() {
        const name = document.getElementById('newRoleName').value;
        if (!name) return showToast('Role name required', 'error');

        const token = localStorage.getItem('hyrostToken');
        try {
            const res = await fetch('/api/admin/role', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ roleName: name })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Role created!', 'success');
                document.getElementById('newRoleName').value = '';
                loadRoles();
            } else {
                showToast(data.message, 'error');
            }
        } catch(err) { showToast('Error creating role', 'error'); }
    }

    async function loadRoles() {
        const list = document.getElementById('rolesList');
        const select = document.getElementById('roleSelect');
        const token = localStorage.getItem('hyrostToken');
        try {
            const res = await fetch('/api/admin/roles', {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            const roles = await res.json();
            
            // Update List
            list.innerHTML = roles.map(r => `<li>${r.name}</li>`).join('');
            
            // Update Select
            select.innerHTML = roles.map(r => `<option value="${r.name}">${r.name}</option>`).join('');
            
        } catch(err) { console.error(err); }
    }

    async function loadUsersForAdmin() {
        const select = document.getElementById('userSelect');
        const token = localStorage.getItem('hyrostToken');
        try {
            // Need an endpoint for this
            const res = await fetch('/api/admin/users', {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            const users = await res.json();
            select.innerHTML = users.map(u => `<option value="${u.id}">${u.username} (${u.role})</option>`).join('');
        } catch(err) { console.error(err); }
    }

    async function assignRoleToUser() {
        const userId = document.getElementById('userSelect').value;
        const roleName = document.getElementById('roleSelect').value;
        const token = localStorage.getItem('hyrostToken');
        
        try {
            const res = await fetch('/api/admin/assign-role', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ targetUserId: userId, roleName: roleName })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                loadUsersForAdmin(); // Refresh list to show new role
            } else {
                showToast(data.message, 'error');
            }
        } catch(err) { showToast('Error assigning role', 'error'); }
    }

    // --- Exchange System Logic ---
    window.openExchangeModal = function() {
        document.getElementById('exchangeModal').classList.add('active');
        updateExchangePreview(); // Initial State
    };

    window.closeExchangeModal = function() {
        document.getElementById('exchangeModal').classList.remove('active');
    };

    window.updateExchangePreview = function() {
        const from = document.getElementById('exFrom').value;
        const to = document.getElementById('exTo').value;
        const amount = parseInt(document.getElementById('exAmount').value) || 0;
        const previewEl = document.getElementById('exPreview');
        const EXCHANGE_RATE = 100;

        if (from === to) {
            previewEl.innerHTML = '<span style="color:#dc3545">Select different currencies</span>';
            return;
        }

        let result = 0;
        let valid = true;
        let msg = "";

        // Logic must match Backend
        if (from === 'bronze' && to === 'silver') {
            if (amount % EXCHANGE_RATE !== 0) { valid = false; msg = `Must be multiple of ${EXCHANGE_RATE}`; }
            else result = amount / EXCHANGE_RATE;
        } 
        else if (from === 'silver' && to === 'bronze') {
            result = amount * EXCHANGE_RATE;
        }
        else if (from === 'silver' && to === 'gold') {
            if (amount % EXCHANGE_RATE !== 0) { valid = false; msg = `Must be multiple of ${EXCHANGE_RATE}`; }
            else result = amount / EXCHANGE_RATE;
        }
        else if (from === 'gold' && to === 'silver') {
            result = amount * EXCHANGE_RATE;
        }
        else {
            valid = false;
            msg = "Conversion not supported directly.";
        }

        if (!valid) {
            previewEl.innerHTML = `<span style="color:#dc3545">${msg || "Invalid"}</span>`;
        } else {
            previewEl.innerHTML = `You will get: <span style="color:#ffd700; font-weight:bold;">${result} ${to.charAt(0).toUpperCase() + to.slice(1)}</span>`;
        }
    };

    window.submitExchange = async function() {
        const from = document.getElementById('exFrom').value;
        const to = document.getElementById('exTo').value;
        const amount = parseInt(document.getElementById('exAmount').value);
        const token = localStorage.getItem('hyrostToken');

        if (!amount || amount <= 0) return showToast("Invalid amount", "error");

        try {
            const res = await fetch('/api/economy/exchange', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ fromCurrency: from, toCurrency: to, amount: amount })
            });

            const data = await res.json();
            
            if (res.ok) {
                showToast(data.message || "Exchange Successful!", "success");
                closeExchangeModal();
                loadUserProfile(); // Refresh coins
            } else {
                showToast(data.message || "Exchange Failed", "error");
            }
        } catch(err) {
            showToast("Server Error", "error");
        }
    };




async function saveUserProfile() {
    const inputEmail = document.getElementById('email');
    
    const updates = {
        email: inputEmail.value
    };
    
    // Password Change Logic
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    
    if (newPass || confirmPass) {
        if (newPass !== confirmPass) {
            showToast("Password baru tidak cocok!", "error");
            return;
        }
        updates.password = newPass;
    }

    // Call API
    showToast('Menyimpan...', 'info');
    const result = await updateProfile(updates);

    if (result.success) {
        showToast('Profil berhasil diperbarui!', 'success');
        loadUserProfile(); 
    } else {
        showToast(result.message || 'Gagal menyimpan profil', 'error');
    }
}

// Variables for Modal Logic
let selectedAvatarUrl = null;

function handleAvatarChange() {
    const modal = document.getElementById('avatarModal');
    if (modal) {
        modal.classList.add('active');
        resetModal();
    }
}

function resetModal() {
    // Reset selection
    selectedAvatarUrl = null;
    document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
    document.getElementById('customAvatarInput').value = '';
    document.getElementById('fileName').textContent = "Tidak ada file dipilih";
    document.getElementById('uploadError').textContent = "";
    
    // Select current if matches one of the presets
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
        const user = JSON.parse(currentUserStr);
        if (user.avatarUrl) {
            const match = document.querySelector(`.avatar-option[data-url="${user.avatarUrl}"]`);
            if (match) {
                match.classList.add('selected');
                selectedAvatarUrl = user.avatarUrl;
            }
        }
    }
}

function setupEventListeners() {
    // Form Submit
    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveUserProfile();
        });
    }

    // Avatar Change Button
    const btnChangeAvatar = document.querySelector('.change-avatar-btn');
    if (btnChangeAvatar) {
        btnChangeAvatar.addEventListener('click', handleAvatarChange);
    }
    
    // Modal Event Listeners
    const modal = document.getElementById('avatarModal');
    const closeBtn = document.getElementById('closeAvatarModal');
    const cancelBtn = document.getElementById('cancelAvatarModal');
    const saveBtn = document.getElementById('saveAvatarModal');
    const fileInput = document.getElementById('customAvatarInput');
    
    if (modal) {
        // Close
        const closeModal = () => modal.classList.remove('active');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        
        // Preset Selection
        document.querySelectorAll('.avatar-option').forEach(opt => {
            opt.addEventListener('click', () => {
                // Clear file input
                if (fileInput) fileInput.value = '';
                document.getElementById('fileName').textContent = "Tidak ada file dipilih";
                document.getElementById('uploadError').textContent = "";
                
                // UI Update
                document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedAvatarUrl = opt.dataset.url;
            });
        });
        
        // File Upload
        if (fileInput) {
            fileInput.addEventListener('change', handleFileUpload);
        }
        
        // Save
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (selectedAvatarUrl) {
                    saveNewAvatar(selectedAvatarUrl);
                    closeModal();
                } else {
                    document.getElementById('uploadError').textContent = "Pilih avatar atau upload foto terlebih dahulu.";
                }
            });
        }
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // --- NEW: Interactivity Logic ---

    // 0. Actions Menu & Logout
    const menuToggle = document.getElementById('profileMenuToggle');
    const menuDropdown = document.getElementById('profileActionDropdown');
    const btnLogout = document.getElementById('btnLogout');

    if (menuToggle && menuDropdown) {
        console.log("DEBUG: Menu Toggle Found");
        // Toggle
        menuToggle.addEventListener('click', (e) => {
            console.log("DEBUG: Menu Clicked");
            e.stopPropagation();
            menuDropdown.classList.toggle('active');
        });

        // Click Outside to Close
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !menuDropdown.contains(e.target)) {
                menuDropdown.classList.remove('active');
            }
        });
    } else {
        console.error("DEBUG: Menu Toggle or Dropdown NOT Found", { menuToggle, menuDropdown });
    }

    // Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
             // 1. Clear Session
             localStorage.removeItem('currentUser');
             localStorage.removeItem('hyrostToken'); // If exists
             
             // 2. Show Toast & Redirect
             showToast('Logout berhasil. Sampai jumpa!', 'success');
             setTimeout(() => {
                 window.location.href = '../index.html'; // Adjust path if needed
             }, 1000);
        });
    }

    // 1. Google Link Logic (PURE SIMULATION)
    const btnGoogleLink = document.getElementById('btnGoogleLink');
    if (btnGoogleLink) {
        btnGoogleLink.addEventListener('click', (e) => {
            e.preventDefault(); // Stop any default behavior
            
            const isLinked = btnGoogleLink.textContent.trim() === 'Unlink';
            
            if (isLinked) {
                // Simulate Unlink
                if (confirm('Simulasi: Putuskan koneksi Google?')) {
                     updateUserLinkStatus(false);
                     showToast('Akun Google diputus (Simulasi)!', 'info');
                }
            } else {
                // Simulate Link
                btnGoogleLink.textContent = 'Connecting...';
                btnGoogleLink.disabled = true;
                
                setTimeout(() => {
                    updateUserLinkStatus(true);
                    showToast('Akun Google berhasil di-link (Simulasi)!', 'success');
                    btnGoogleLink.disabled = false;
                }, 1500);
            }
        });
    }

    // 2. Delete Account Logic
    const btnDelete = document.getElementById('btnTriggerDelete'); // Changed ID
    const deleteModal = document.getElementById('deleteAccountModal');
    const closeDeleteBtn = document.getElementById('closeDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteAccount');

    if (btnDelete && deleteModal) {
        const closeDel = () => deleteModal.classList.remove('active');
        
        btnDelete.addEventListener('click', () => deleteModal.classList.add('active'));
        if (closeDeleteBtn) closeDeleteBtn.addEventListener('click', closeDel);
        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDel);
        
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', async () => {
                 // PERFORM DELETE logic
                 const token = localStorage.getItem('hyrostToken');
                 try {
                     const res = await fetch(`${window.location.origin}/api/users/delete`, {
                         method: 'DELETE', // or POST if you prefer
                         headers: {
                             'Authorization': `Bearer ${token}`
                         }
                     });
                     
                     const data = await res.json();
                     if (res.ok) {
                        showToast(data.message, 'success');
                        localStorage.removeItem('currentUser');
                        localStorage.removeItem('hyrostToken');
                        setTimeout(() => {
                            window.location.href = '../auth/login.html'; 
                        }, 2000);
                     } else {
                        showToast(data.message || 'Gagal menghapus akun', 'error');
                     }
                 } catch (err) {
                     showToast('Connection Error', 'error');
                 }
            });
        }
        
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeDel();
        });
    }

    // 3. Password Validation Visuals
    const newPassInput = document.getElementById('newPassword');
    const confirmPassInput = document.getElementById('confirmPassword');
    
    function validatePasswords() {
        if (!newPassInput.value || !confirmPassInput.value) {
            confirmPassInput.style.borderColor = '#333';
            return;
        }
        if (newPassInput.value === confirmPassInput.value) {
            confirmPassInput.style.borderColor = '#4caf50'; // Green
        } else {
            confirmPassInput.style.borderColor = '#dc3545'; // Red
        }
    }
    
    if (newPassInput && confirmPassInput) {
        newPassInput.addEventListener('input', validatePasswords);
        confirmPassInput.addEventListener('input', validatePasswords);
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    const errorMsg = document.getElementById('uploadError');
    const fileNameDisplay = document.getElementById('fileName');
    
    // Reset preset selection
    document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
    selectedAvatarUrl = null;
    
    if (!file) {
        fileNameDisplay.textContent = "Tidak ada file dipilih";
        return;
    }
    
    // Validate Type
    if (!file.type.startsWith('image/')) {
        errorMsg.textContent = "Mohon upload file gambar valid.";
        fileNameDisplay.textContent = "File tidak valid";
        return;
    }
    
    fileNameDisplay.textContent = file.name;
    
    // Read Image for Compression and Validation
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // 1. Validation Logic
            if (this.width < 16 || this.height < 16) {
                errorMsg.textContent = `Ukuran foto terlalu kecil (${this.width}x${this.height}). Minimal 16x16 pixel.`;
                selectedAvatarUrl = null;
                return;
            }

            // 2. Client-Side Resizing & Compression (Max 512px, JPEG 0.7)
            const MAX_SIZE = 512;
            let width = this.width;
            let height = this.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this, 0, 0, width, height);

            // Compress to JPEG 0.7 quality to reduce size significantly
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

            // Success
            errorMsg.textContent = "";
            selectedAvatarUrl = compressedDataUrl;
            
            console.log(`DEBUG: Image compressed. Original: ${event.target.result.length}, Compressed: ${compressedDataUrl.length}`);
            // Optional: Preview could be shown here
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function saveNewAvatar(url) {
    showToast('Mengubah Avatar...', 'info');
    
    const result = await updateProfile({ avatarUrl: url });
    
    if (result.success) {
        showToast("Avatar berhasil diubah!", "success");
        loadUserProfile();
        
        // Also update sidebar avatar if exists
        const sidebarAvatar = document.getElementById('userAvatar');
        if (sidebarAvatar) sidebarAvatar.src = url;

        // Update Banner Avatar
        const bannerAvatar = document.getElementById('bannerAvatar');
        if (bannerAvatar) bannerAvatar.src = url;
        
        // Dispatch event so other components know user data changed
        window.dispatchEvent(new Event('userProfileUpdated'));
    } else {
        showToast("Gagal mengubah avatar: " + result.message, "error");
    }
}

// Helper: Toast Notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas ${iconClass} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remove after 3s
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

// Helper: Update Link Status in Storage
function updateUserLinkStatus(linked) {
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) return;
    
    const user = JSON.parse(currentUserStr);
    
    // Toggle logic
    if (linked) {
        user.googleId = "mock-google-id-123";
        user.linkedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } else {
        delete user.googleId;
        delete user.linkedAt;
    }
    
    // Save to session and DB
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    // Refresh UI
    loadUserProfile();
}
