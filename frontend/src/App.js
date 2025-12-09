// Hyrost Frontend Entry
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import ForumPage from './pages/ForumPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import MembershipPage from './pages/MembershipPage';
import './styles/main.css';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/forum/*" element={<ForumPage />} />
          <Route path="/chat/*" element={<ChatPage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/membership" element={<MembershipPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
