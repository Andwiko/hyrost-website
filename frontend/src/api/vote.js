import axios from 'axios';

const API_URL = 'http://localhost:5000/api/vote';

export const castVote = async (targetType, targetId, voteType) => {
  const response = await axios.post(API_URL, { targetType, targetId, voteType });
  return response.data.votes;
};

export const getVotes = async (targetType, targetId) => {
  const response = await axios.get(`${API_URL}/${targetType}/${targetId}`);
  return response.data.votes;
};