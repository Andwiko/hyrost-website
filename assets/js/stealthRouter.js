/**
 * HYROST — Client-Side Navigation Helper
 * Semua fungsi navigasi menggunakan stealth token agar URL file tidak terekspos.
 *
 * Token Map:
 *   pv3Ad  → dashboard.html
 *   Lg8In  → auth/login
 *   Rg3St  → auth/register
 *   aCc9T  → account/
 *   xK9Lm  → modules/admin
 *   ... (lihat backend/utils/stealthRouter.js untuk daftar lengkap)
 */
(function (global) {

  /** Navigasi ke Dashboard (memerlukan login) */
  global.goToDashboard = function () {
    global.location.href = '/dashboard';
  };

  /** Navigasi ke halaman Login */
  global.showLoginModal = function () {
    global.window.location.href = '/auth/login.html';
  };

  /** Navigasi ke halaman Register */
  global.goToRegister = function () {
    global.window.location.href = '/auth/register.html';
  };

  /** Navigasi ke Profil Akun */
  global.goToAccount = function () {
    global.location.href = '/account';
  };

  /** Navigasi ke Forum */
  global.goToForum = function () {
    global.window.location.href = '/modules/forum.html';
  };

  /** Navigasi ke Leaderboard */
  global.goToLeaderboard = function () {
    global.window.location.href = '/modules/leaderboard.html';
  };

  /** Navigasi ke Marketplace */
  global.goToMarketplace = function () {
    global.location.href = '/marketplace';
  };

  /** Navigasi ke Wiki */
  global.goToWiki = function () {
    global.window.location.href = '/modules/wiki.html';
  };

  /** Navigasi ke Inventaris */
  global.goToInventory = function () {
    global.window.location.href = '/inventory/inventory.html';
  };

  /** Navigasi ke Admin Panel */
  global.goToAdmin = function () {
    global.window.location.href = '/modules/admin.html';
  };

  /** Navigasi ke 3D Skin Studio */
  global.goToSkin = function () {
    global.window.location.href = '/bot/skin.html';
  };

  /** Navigasi ke halaman utama */
  global.goToHome = function () {
    global.location.href = '/';
  };

  /**
   * Helper umum: navigasi ke token manapun.
   * Contoh: navigateTo('mAp3D')  → /map
   */
  global.navigateTo = function (token) {
    if (!token) return;
    global.location.href = '/?=' + token;
  };

})(typeof window !== 'undefined' ? window : this);
