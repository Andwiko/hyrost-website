import React, { useState, useEffect } from 'react';
import { fetchTickets, createTicket, updateTicket } from '../api/tickets';

const TicketPage = () => {
  const [tickets, setTickets] = useState([]);
  const [newTicket, setNewTicket] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const data = await fetchTickets();
        setTickets(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    loadTickets();
  }, []);

  const handleCreateTicket = async () => {
    try {
      const createdTicket = await createTicket(newTicket);
      setTickets([...tickets, createdTicket]);
      setNewTicket({ title: '', description: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateTicket = async (ticketId, status) => {
    try {
      await updateTicket(ticketId, { status });
      const updatedTickets = tickets.map(ticket => 
        ticket._id === ticketId ? { ...ticket, status } : ticket
      );
      setTickets(updatedTickets);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading tickets...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="tickets-container">
      <h2>Tickets</h2>
      
      <div className="create-ticket">
        <h3>Create New Ticket</h3>
        <input
          type="text"
          placeholder="Title"
          value={newTicket.title}
          onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
        />
        <textarea
          placeholder="Description"
          value={newTicket.description}
          onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
        />
        <button onClick={handleCreateTicket}>Submit Ticket</button>
      </div>
      
      <div className="tickets-list">
        {tickets.map(ticket => (
          <div key={ticket._id} className="ticket-item">
            <h3>{ticket.title}</h3>
            <p>{ticket.description}</p>
            <p>Status: {ticket.status}</p>
            <div className="ticket-actions">
              <button onClick={() => handleUpdateTicket(ticket._id, 'resolved')}>
                Mark as Resolved
              </button>
              <button onClick={() => handleUpdateTicket(ticket._id, 'closed')}>
                Close Ticket
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicketPage;