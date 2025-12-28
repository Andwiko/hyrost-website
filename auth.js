const AUTH_KEY = 'hyrostAuth'; // still used for fallback or removed? logic below replaces it.
const API_URL = '/api'; // Relative path works for both Local and VPS (since backend serves frontend)

// Fungsi untuk register
async function register(username, password) {
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email: username, password }) // Assuming simple register uses username as email for now or adjust logic
        });
        const data = await res.json();
        if (!res.ok) return { success: false, message: data.message };
        
        // Save Session
        localStorage.setItem('currentUser', JSON.stringify({ ...data.user, loggedInAt: new Date().toISOString() }));
        localStorage.setItem('hyrostToken', data.token);
        
        return { success: true, message: 'Registrasi berhasil' };
    } catch (err) {
        return { success: false, message: 'Connection Error' };
    }
}

// Fungsi untuk login
async function login(username, password) {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: username, password }) // Backend accepts email or username
        });
        const data = await res.json();
        if (!res.ok) return { success: false, message: data.message };

        // Save Session
        const { password: _, ...userSession } = data.user;
        localStorage.setItem('currentUser', JSON.stringify({ ...userSession, loggedInAt: new Date().toISOString() }));
        localStorage.setItem('hyrostToken', data.token);
        
        return { success: true, message: 'Login berhasil' };
    } catch (err) {
        return { success: false, message: 'Connection Error' };
    }
}

// Fungsi untuk logout
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('hyrostToken');
    return { success: true, message: 'Logout berhasil' };
}

// Fungsi untuk cek apakah user sudah login
function isLoggedIn() {
    return localStorage.getItem('currentUser') !== null;
}

// Fungsi untuk mendapatkan user yang sedang login
function getCurrentUser() {
    const u = localStorage.getItem('currentUser');
    return u ? JSON.parse(u) : null;
}

// Fungsi untuk update data profile (via API)
async function updateProfile(updates) {
    const token = localStorage.getItem('hyrostToken');
    if (!token) return { success: false, message: 'No token' };

    try {
        const res = await fetch(`${API_URL}/users/update`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (!res.ok) {
            console.error("DEBUG: Update Profile API Error:", data);
            return { success: false, message: data.message };
        }

        // Update Local Session
        const currentUser = getCurrentUser();
        const updatedUser = { ...currentUser, ...data.user };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        return { success: true, message: 'Profil berhasil diupdate', user: updatedUser };
    } catch (err) {
        console.error("DEBUG: Update Profile Network/Auth Error:", err);
        return { success: false, message: 'Connection Error: ' + err.message };
    }
}

export { register, login, logout, isLoggedIn, getCurrentUser, updateProfile };
