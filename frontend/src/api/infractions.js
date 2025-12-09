import axios from 'axios';

const API_URL = '/api/infractions';

export const fetchUserInfractions = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const fetchActiveInfractions = async () => {
  const response = await axios.get(`${API_URL}/active`);
  return response.data;
};

export const createInfraction = async (infractionData) => {
  const response = await axios.post(API_URL, infractionData);
  return response.data;
};

export const updateInfraction = async (infractionId, updateData) => {
  await axios.patch(`${API_URL}/${infractionId}`, updateData);
};