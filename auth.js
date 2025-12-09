// Sistem Autentikasi Sederhana
const AUTH_KEY = 'hyrostAuth';

// Fungsi untuk register
function register(username, password) {
    const users = JSON.parse(localStorage.getItem(AUTH_KEY)) || [];
    
    // Cek apakah username sudah ada
    if (users.some(user => user.username === username)) {
        return { success: false, message: 'Username sudah digunakan' };
    }
    
    // Tambahkan user baru
    users.push({
        username: username,
        password: password, // Dalam aplikasi nyata, password harus di-hash
        createdAt: new Date().toISOString()
    });
    
    localStorage.setItem(AUTH_KEY, JSON.stringify(users));
    return { success: true, message: 'Registrasi berhasil' };
}

// Fungsi untuk login
function login(username, password) {
    const users = JSON.parse(localStorage.getItem(AUTH_KEY)) || [];
    const user = users.find(user => user.username === username && user.password === password);
    
    if (user) {
        // Set session (simpan di localStorage juga)
        localStorage.setItem('currentUser', JSON.stringify({
            username: user.username,
            loggedInAt: new Date().toISOString()
        }));
        return { success: true, message: 'Login berhasil' };
    }
    
    return { success: false, message: 'Username atau password salah' };
}

// Fungsi untuk logout
function logout() {
    localStorage.removeItem('currentUser');
    return { success: true, message: 'Logout berhasil' };
}

// Fungsi untuk cek apakah user sudah login
function isLoggedIn() {
    return localStorage.getItem('currentUser') !== null;
}

// Fungsi untuk mendapatkan user yang sedang login
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

export { register, login, logout, isLoggedIn, getCurrentUser };
