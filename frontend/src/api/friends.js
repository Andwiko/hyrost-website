import axios from 'axios';

const API_URL = '/api/friends';

export const fetchFriends = async () => {
  const response = await axios.get(`${API_URL}`);
  return response.data;
};

export const fetchFriendRequests = async () => {
  const response = await axios.get(`${API_URL}/requests`);
  return response.data;
};

export const sendFriendRequest = async (username) => {
  await axios.post(`${API_URL}/requests`, { username });
};

export const respondToFriendRequest = async (requestId, accept) => {
  await axios.patch(`${API_URL}/requests/${requestId}`, { accept });
};

export const removeFriend = async (friendId) => {
  await axios.delete(`${API_URL}/${friendId}`);
};