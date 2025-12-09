import React, { useState, useEffect } from 'react';
import { fetchStaffMembers } from '../api/staff';

const StaffPage = () => {
  const [staffMembers, setStaffMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const data = await fetchStaffMembers();
        setStaffMembers(data);
      } catch (error) {
        console.error('Error loading staff:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStaff();
  }, []);

  if (isLoading) return <div>Memuat daftar staff...</div>;

  return (
    <div className="staff-container">
      <h1>Tim Staff</h1>
      
      <div className="staff-list">
        {staffMembers.map(staff => (
          <div key={staff._id} className="staff-card">
            <div className="staff-avatar">
              <img src={staff.avatar || '/default-avatar.png'} alt={staff.username} />
            </div>
            <div className="staff-info">
              <h3>{staff.username}</h3>
              <p className="staff-role">{staff.role}</p>
              <p className="staff-responsibility">{staff.responsibility}</p>
              <p className="staff-contact">
                <strong>Kontak: </strong>{staff.contactMethod}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StaffPage;