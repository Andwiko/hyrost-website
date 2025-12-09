import React from 'react';

// Google Sign-In button component
function GoogleLoginButton({ onSuccess }) {
  React.useEffect(() => {
    /* global google */
    if (window.google && !document.getElementById('g_id_onload')) {
      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        callback: onSuccess,
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'outline', size: 'large', shape: 'pill' }
      );
    }
  }, [onSuccess]);

  return <div id="google-signin-btn"></div>;
}

export default GoogleLoginButton;
