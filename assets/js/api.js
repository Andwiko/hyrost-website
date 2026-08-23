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
