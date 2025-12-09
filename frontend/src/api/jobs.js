import axios from 'axios';

const API_URL = '/api/jobs';

export const fetchJobs = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const fetchMyApplications = async () => {
  const response = await axios.get(`${API_URL}/applications`);
  return response.data;
};

export const createJob = async (jobData) => {
  const response = await axios.post(API_URL, jobData);
  return response.data;
};

export const applyForJob = async (jobId) => {
  await axios.post(`${API_URL}/${jobId}/apply`);
};