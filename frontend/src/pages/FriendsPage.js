import React, { useState, useEffect } from 'react';
import { 
  fetchFriendRequests, 
  sendFriendRequest, 
  respondToFriendRequest,
  fetchFriends,
  removeFriend
} from '../api/friends';

const FriendsPage = () => {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [friendsData, requestsData] = await Promise.all([
          fetchFriends(),
          fetchFriendRequests()
        ]);
        setFriends(friendsData);
        setRequests(requestsData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSendRequest = async () => {
    try {
      await sendFriendRequest(newFriendUsername);
      setNewFriendUsername('');
      // Refresh requests
      const updatedRequests = await fetchFriendRequests();
      setRequests(updatedRequests);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRespondToRequest = async (requestId, accept) => {
    try {
      await respondToFriendRequest(requestId, accept);
      // Refresh both friends and requests
      const [friendsData, requestsData] = await Promise.all([
        fetchFriends(),
        fetchFriendRequests()
      ]);
      setFriends(friendsData);
      setRequests(requestsData);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await removeFriend(friendId);
      const updatedFriends = await fetchFriends();
      setFriends(updatedFriends);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading friends data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="friends-container">
      <h2>Friends</h2>
      
      <div className="friend-requests">
        <h3>Friend Requests</h3>
        {requests.length === 0 ? (
          <p>No pending friend requests</p>
        ) : (
          <ul>
            {requests.map(request => (
              <li key={request._id}>
                <span>{request.requester.username}</span>
                <button onClick={() => handleRespondToRequest(request._id, true)}>
                  Accept
                </button>
                <button onClick={() => handleRespondToRequest(request._id, false)}>
                  Decline
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="add-friend">
        <h3>Add Friend</h3>
        <input
          type="text"
          placeholder="Enter username"
          value={newFriendUsername}
          onChange={(e) => setNewFriendUsername(e.target.value)}
        />
        <button onClick={handleSendRequest}>Send Request</button>
      </div>
      
      <div className="friends-list">
        <h3>Your Friends</h3>
        {friends.length === 0 ? (
          <p>You don't have any friends yet</p>
        ) : (
          <ul>
            {friends.map(friend => (
              <li key={friend._id}>
                <span>{friend.username}</span>
                <button onClick={() => handleRemoveFriend(friend._id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;