import axios from 'axios';

const API_URL = 'http://localhost:5000/api/staff';

export const fetchStaffMembers = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const addStaffMember = async (staffData) => {
  const response = await axios.post(API_URL, staffData);
  return response.data;
};

export const updateStaffMember = async (staffId, staffData) => {
  const response = await axios.put(`${API_URL}/${staffId}`, staffData);
  return response.data;
};