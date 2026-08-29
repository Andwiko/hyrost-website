// Instant Stealth Route Address Bar Normalizer (e.g. /dashboard.html -> /?=pv3Ad)
(function enforceStealthUrl() {
  try {
    if (typeof window === 'undefined' || !window.location || !window.history || !window.history.replaceState) return;
    const STEALTH_MAP = {
      'dashboard.html': 'pv3Ad', 'dashboard': 'pv3Ad',
      'bot/skin.html': 'sK1nS', 'bot/skin': 'sK1nS',
      'bot/index.html': 'b0tM3', 'bot/index': 'b0tM3',
      'modules/admin.html': 'xK9Lm', 'modules/admin': 'xK9Lm',
      'modules/store.html': 't7Y4b', 'modules/store': 't7Y4b',
      'modules/leaderboard.html': 'lDb8R', 'modules/leaderboard': 'lDb8R',
      'modules/rewards.html': 'rW9Dz', 'modules/rewards': 'rW9Dz',
      'modules/forum.html': 'f0rUm', 'modules/forum': 'f0rUm',
      'modules/wiki.html': 'wK1iX', 'modules/wiki': 'wK1iX',
      'account/index.html': 'aCc9T', 'account': 'aCc9T',
      'inventory/inventory.html': 'iNv4K', 'inventory': 'iNv4K',
      'auth/login.html': 'Lg8In', 'auth/login': 'Lg8In',
      'auth/register.html': 'Rg3St', 'auth/register': 'Rg3St'
    };

    const p = window.location.pathname.replace(/^\/+/, '').toLowerCase();
    const search = window.location.search || '';
    const hash = window.location.hash || '';

    if (search.startsWith('?=')) return;

    if (STEALTH_MAP[p]) {
      window.history.replaceState(null, '', `/?=${STEALTH_MAP[p]}${hash}`);
    } else if (p === 'index.html') {
      window.history.replaceState(null, '', `/${search}${hash}`);
    }
  } catch (_) {}
})();

(function (global) {
  const API = '/api';
  let isRefreshing = false;
  let refreshSubscribers = [];

  function subscribeTokenRefresh(cb) {
    refreshSubscribers.push(cb);
  }

  function onRefreshed(token) {
    refreshSubscribers.map((cb) => cb(token));
    refreshSubscribers = [];
  }

  function getToken() {
    return localStorage.getItem('hyrostToken');
  }

  function getRefreshToken() {
    return localStorage.getItem('hyrostRefreshToken');
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
    localStorage.removeItem('hyrostRefreshToken');
    localStorage.removeItem('currentUser');
    const path = window.location.pathname;
    const isAuthPage = path.includes('/auth/');
    if (!isAuthPage) {
      window.location.href = path.includes('/modules/') || path.includes('/account/') || path.includes('/inventory/') || path.includes('/marketplace/')
        ? '../auth/login.html'
        : 'auth/login.html';
    }
  }

  async function tryRefreshToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('hyrostToken', data.token);
        if (data.refreshToken) {
          localStorage.setItem('hyrostRefreshToken', data.refreshToken);
        }
        if (data.user) {
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
          localStorage.setItem('currentUser', JSON.stringify({ ...currentUser, ...data.user }));
        }
        return data.token;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: getAuthHeaders(options.headers || {}),
    });

    if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          const newToken = await tryRefreshToken();
          isRefreshing = false;
          if (newToken) {
            onRefreshed(newToken);
            // Retry with new token
            return apiFetch(path, {
              ...options,
              headers: {
                ...(options.headers || {}),
                Authorization: `Bearer ${newToken}`
              }
            });
          } else {
            logout();
            throw new Error('Sesi berakhir, silakan login kembali');
          }
        } else {
          return new Promise((resolve) => {
            subscribeTokenRefresh((newToken) => {
              resolve(
                apiFetch(path, {
                  ...options,
                  headers: {
                    ...(options.headers || {}),
                    Authorization: `Bearer ${newToken}`
                  }
                })
              );
            });
          });
        }
      } else {
        logout();
        throw new Error('Sesi berakhir, silakan login kembali');
      }
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

  global.HyrostAPI = { API, getToken, getRefreshToken, getAuthHeaders, apiFetch, logout };
})(window);
