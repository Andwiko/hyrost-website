import axios from 'axios';

const API_URL = 'http://localhost:5000/api/forum';

export const fetchThreads = async () => {
  const response = await axios.get(`${API_URL}/threads`);
  return response.data;
};

export const createThread = async (threadData) => {
  const response = await axios.post(`${API_URL}/threads`, threadData);
  return response.data;
};

export const replyThread = async (threadId, replyData) => {
  const response = await axios.post(`${API_URL}/threads/${threadId}/replies`, replyData);
  return response.data;
};