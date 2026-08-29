/**
 * HYROST — Client-Side Navigation Helper
 * Semua fungsi navigasi menggunakan stealth token agar URL file tidak terekspos.
 *
 * Token Map:
 *   pv3Ad  → dashboard.html
 *   Lg8In  → auth/login.html
 *   Rg3St  → auth/register.html
 *   aCc9T  → account/index.html
 *   xK9Lm  → modules/admin.html
 *   ... (lihat backend/utils/stealthRouter.js untuk daftar lengkap)
 */
(function (global) {

  /** Navigasi ke Dashboard (memerlukan login) */
  global.goToDashboard = function () {
    global.location.href = '/?=pv3Ad';
  };

  /** Navigasi ke halaman Login */
  global.showLoginModal = function () {
    global.location.href = '/?=Lg8In';
  };

  /** Navigasi ke halaman Register */
  global.goToRegister = function () {
    global.location.href = '/?=Rg3St';
  };

  /** Navigasi ke Profil Akun */
  global.goToAccount = function () {
    global.location.href = '/?=aCc9T';
  };

  /** Navigasi ke Forum */
  global.goToForum = function () {
    global.location.href = '/?=f0rUm';
  };

  /** Navigasi ke Leaderboard */
  global.goToLeaderboard = function () {
    global.location.href = '/?=lDb8R';
  };

  /** Navigasi ke Marketplace */
  global.goToMarketplace = function () {
    global.location.href = '/?=mSh0p';
  };

  /** Navigasi ke Wiki */
  global.goToWiki = function () {
    global.location.href = '/?=wK1iX';
  };

  /** Navigasi ke Inventaris */
  global.goToInventory = function () {
    global.location.href = '/?=iNv4K';
  };

  /** Navigasi ke Admin Panel */
  global.goToAdmin = function () {
    global.location.href = '/?=xK9Lm';
  };

  /** Navigasi ke 3D Skin Studio */
  global.goToSkin = function () {
    global.location.href = '/?=sK1nS';
  };

  /** Navigasi ke halaman utama */
  global.goToHome = function () {
    global.location.href = '/';
  };

  /**
   * Helper umum: navigasi ke token manapun.
   * Contoh: navigateTo('mAp3D')  → /?=mAp3D
   */
  global.navigateTo = function (token) {
    if (!token) return;
    global.location.href = '/?=' + token;
  };

})(typeof window !== 'undefined' ? window : this);
