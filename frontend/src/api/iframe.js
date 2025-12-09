import axios from 'axios';

const API_URL = '/api/iframes';

export const getIframes = async () => {
  return await axios.get(API_URL);
};

export const createIframe = async (iframeData) => {
  return await axios.post(API_URL, iframeData);
};

export const updateIframe = async (id, iframeData) => {
  return await axios.put(`${API_URL}/${id}`, iframeData);
};

export const toggleIframeStatus = async (id) => {
  return await axios.patch(`${API_URL}/${id}/toggle`);
};