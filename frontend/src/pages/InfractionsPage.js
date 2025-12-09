import React, { useState, useEffect } from 'react';
import { 
  fetchUserInfractions,
  createInfraction,
  updateInfraction,
  fetchActiveInfractions
} from '../api/infractions';

const InfractionsPage = () => {
  const [infractions, setInfractions] = useState([]);
  const [activeInfractions, setActiveInfractions] = useState([]);
  const [newInfraction, setNewInfraction] = useState({
    userId: '',
    type: 'warning',
    reason: '',
    duration: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [infractionsData, activeData] = await Promise.all([
          fetchUserInfractions(),
          fetchActiveInfractions()
        ]);
        setInfractions(infractionsData);
        setActiveInfractions(activeData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleCreateInfraction = async () => {
    try {
      const createdInfraction = await createInfraction(newInfraction);
      setInfractions([...infractions, createdInfraction]);
      setNewInfraction({
        userId: '',
        type: 'warning',
        reason: '',
        duration: ''
      });
      // Refresh active infractions
      const updatedActive = await fetchActiveInfractions();
      setActiveInfractions(updatedActive);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateInfraction = async (infractionId, action) => {
    try {
      await updateInfraction(infractionId, { action });
      // Refresh both lists
      const [infractionsData, activeData] = await Promise.all([
        fetchUserInfractions(),
        fetchActiveInfractions()
      ]);
      setInfractions(infractionsData);
      setActiveInfractions(activeData);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading infractions data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="infractions-container">
      <h2>Infractions</h2>
      
      <div className="active-infractions">
        <h3>Active Infractions</h3>
        {activeInfractions.length === 0 ? (
          <p>No active infractions</p>
        ) : (
          <ul>
            {activeInfractions.map(infraction => (
              <li key={infraction._id}>
                <span>{infraction.user.username} - {infraction.type} ({infraction.reason})</span>
                <span>Expires: {new Date(infraction.expiresAt).toLocaleString()}</span>
                <button onClick={() => handleUpdateInfraction(infraction._id, 'pardon')}>
                  Pardon
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="create-infraction">
        <h3>Create New Infraction</h3>
        <input
          type="text"
          placeholder="User ID"
          value={newInfraction.userId}
          onChange={(e) => setNewInfraction({...newInfraction, userId: e.target.value})}
        />
        <select
          value={newInfraction.type}
          onChange={(e) => setNewInfraction({...newInfraction, type: e.target.value})}
        >
          <option value="warning">Warning</option>
          <option value="mute">Mute</option>
          <option value="kick">Kick</option>
          <option value="ban">Ban</option>
          <option value="note">Note</option>
        </select>
        <input
          type="text"
          placeholder="Reason"
          value={newInfraction.reason}
          onChange={(e) => setNewInfraction({...newInfraction, reason: e.target.value})}
        />
        <input
          type="text"
          placeholder="Duration (e.g. 7d)"
          value={newInfraction.duration}
          onChange={(e) => setNewInfraction({...newInfraction, duration: e.target.value})}
        />
        <button onClick={handleCreateInfraction}>Create Infraction</button>
      </div>
      
      <div className="infractions-history">
        <h3>Infractions History</h3>
        {infractions.length === 0 ? (
          <p>No infractions recorded</p>
        ) : (
          <ul>
            {infractions.map(infraction => (
              <li key={infraction._id}>
                <span>{infraction.user.username} - {infraction.type} ({infraction.reason})</span>
                <span>Issued: {new Date(infraction.createdAt).toLocaleString()}</span>
                <span>Status: {infraction.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default InfractionsPage;