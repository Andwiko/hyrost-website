import React, { useState, useEffect } from 'react';
import { fetchMembers } from '../api/members';

const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadMembers = async () => {
      const data = await fetchMembers();
      setMembers(data);
    };
    loadMembers();
  }, []);

  const filteredMembers = members.filter(member => 
    member.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="members-container">
      <h1>Daftar Anggota</h1>
      
      <div className="search-bar">
        <input
          type="text"
          placeholder="Cari anggota..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="members-list">
        {filteredMembers.map(member => (
          <div key={member._id} className="member-card">
            <div className="member-avatar">
              <img src={member.avatar || '/default-avatar.png'} alt={member.username} />
            </div>
            <div className="member-info">
              <h3>{member.username}</h3>
              <p>Bergabung: {new Date(member.joinDate).toLocaleDateString()}</p>
              <p>Status: {member.status || 'Aktif'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MembersPage;