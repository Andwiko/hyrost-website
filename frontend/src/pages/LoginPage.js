import React from 'react';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { API_URL } from '../api/api';
import useAuth from '../hooks/useAuth';

function handleGoogleSuccess(response) {
  // Send Google credential to backend
  fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: response.credential })
  })
    .then(res => res.json())
    .then(data => {
      // TODO: Save JWT, redirect, etc.
      setToken(data.token);
      setUser(data.user);
      alert('Google login success!');
    })
    .catch(() => alert('Google login failed.'));
}

function LoginPage() {
  const { setUser, setToken } = useAuth();
  return (
    <div>
      <h2>Login to Hyrost</h2>
      {/* Add login form, Google login, etc. */}
      <GoogleLoginButton onSuccess={handleGoogleSuccess} />
    </div>
  );
}

export default LoginPage;
