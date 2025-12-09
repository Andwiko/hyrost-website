import axios from 'axios';

const API_URL = 'http://localhost:5000/api/rules';

export const fetchRules = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const addRule = async (ruleData) => {
  const response = await axios.post(API_URL, ruleData);
  return response.data;
};

export const updateRule = async (ruleId, ruleData) => {
  const response = await axios.put(`${API_URL}/${ruleId}`, ruleData);
  return response.data;
};