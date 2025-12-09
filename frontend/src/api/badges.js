import axios from 'axios';

const API_URL = '/api/badges';

export const fetchBadges = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const awardBadge = async (userId, badgeId) => {
  await axios.post(`${API_URL}/award`, { userId, badgeId });
};