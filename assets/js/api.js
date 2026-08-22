(function (global) {
  const API = '/api';

  function getToken() {
    return localStorage.getItem('hyrostToken');
  }

  function getAuthHeaders(extra = {}) {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  }

  function logout() {
    localStorage.removeItem('hyrostToken');
    localStorage.removeItem('currentUser');
    const path = window.location.pathname;
    const isAuthPage = path.includes('/auth/');
    if (!isAuthPage) {
      window.location.href = path.includes('/modules/') || path.includes('/account/')
        ? '../auth/login.html'
        : 'auth/login.html';
    }
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: getAuthHeaders(options.headers || {}),
    });

    if (res.status === 401) {
      logout();
      throw new Error('Sesi berakhir, silakan login kembali');
    }

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await res.json().catch(() => ({}))
      : {};

    if (!res.ok) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }

    return data;
  }

  global.HyrostAPI = { API, getToken, getAuthHeaders, apiFetch, logout };
})(window);
