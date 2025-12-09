import React, { useState } from 'react';

function Dashboard() {
  // Dummy data, replace with fetch from backend
  const [users] = useState([
    { id: 1, username: 'admin', email: 'admin@hyrost.com', role: 'admin' },
    { id: 2, username: 'user1', email: 'user1@hyrost.com', role: 'user' },
  ]);

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <h3>User Management</h3>
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.id}</td><td>{u.username}</td><td>{u.email}</td><td>{u.role}</td>
              <td><button>Ban</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Add stats, moderation, etc. */}
    </div>
  );
}

export default Dashboard;
