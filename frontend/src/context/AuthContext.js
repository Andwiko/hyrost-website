import { createContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('hyrost_token'));

  useEffect(() => {
    if (token) localStorage.setItem('hyrost_token', token);
    else localStorage.removeItem('hyrost_token');
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, setUser, token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
