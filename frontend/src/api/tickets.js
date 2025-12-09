import axios from 'axios';

const API_URL = '/api/tickets';

export const fetchTickets = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const createTicket = async (ticketData) => {
  const response = await axios.post(API_URL, ticketData);
  return response.data;
};

export const updateTicket = async (ticketId, updateData) => {
  await axios.patch(`${API_URL}/${ticketId}`, updateData);
};