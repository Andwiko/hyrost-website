/**
 * HYROST — Standard Navigation Utilities
 */
(function (global) {
  global.goToDashboard = function () {
    global.location.href = '/dashboard.html';
  };
  global.showLoginModal = function () {
    global.location.href = '/auth/login.html';
  };
})(typeof window !== 'undefined' ? window : this);
