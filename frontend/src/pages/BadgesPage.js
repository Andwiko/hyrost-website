import React, { useState, useEffect } from 'react';
import { fetchBadges, awardBadge } from '../api/badges';

const BadgesPage = () => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBadges = async () => {
      try {
        const data = await fetchBadges();
        setBadges(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    loadBadges();
  }, []);

  const handleAwardBadge = async (userId, badgeId) => {
    try {
      await awardBadge(userId, badgeId);
      // Refresh badges list
      const data = await fetchBadges();
      setBadges(data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading badges...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="badges-container">
      <h2>Badges</h2>
      <div className="badges-list">
        {badges.map(badge => (
          <div key={badge._id} className="badge-item">
            <img src={`/assets/images/icon/${badge.icon}`} alt={badge.name} />
            <h3>{badge.name}</h3>
            <p>{badge.description}</p>
            <button onClick={() => handleAwardBadge('current-user-id', badge._id)}>
              Award Badge
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgesPage;