import axios from 'axios';

const API_URL = 'http://localhost:5000/api/members';

export const fetchMembers = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const getMemberProfile = async (memberId) => {
  const response = await axios.get(`${API_URL}/${memberId}`);
  return response.data;
};

export const updateMemberProfile = async (memberId, profileData) => {
  const response = await axios.put(`${API_URL}/${memberId}`, profileData);
  return response.data;
};