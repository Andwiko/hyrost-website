import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav>
      <Link to="/">Hyrost</Link>
      <Link to="/forum">Forum</Link>
      <Link to="/chat">Chat</Link>
      <Link to="/membership">Membership</Link>
      <Link to="/profile/1">Profile</Link>
      <Link to="/login">Login</Link>
    </nav>
  );
}

export default Navbar;
