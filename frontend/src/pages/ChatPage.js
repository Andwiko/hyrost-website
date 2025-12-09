import React, { useState, useEffect, useRef } from 'react';
// import io from 'socket.io-client'; // Uncomment if using socket.io
// const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');

function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  // const messagesEndRef = useRef(null);

  // useEffect(() => {
  //   socket.on('message', msg => setMessages(msgs => [...msgs, msg]));
  //   return () => socket.off('message');
  // }, []);

  const sendMessage = e => {
    e.preventDefault();
    if (!input) return;
    // socket.emit('message', input);
    setMessages([...messages, { text: input, self: true }]);
    setInput('');
  };

  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  return (
    <div>
      <h2>Community Chat (Demo)</h2>
      <div style={{height:300,overflowY:'auto',border:'1px solid #d4af37',padding:10,marginBottom:10}}>
        {messages.map((m, i) => (
          <div key={i} style={{textAlign:m.self?'right':'left'}}>{m.text}</div>
        ))}
        {/* <div ref={messagesEndRef} /> */}
      </div>
      <form onSubmit={sendMessage}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." />
        <button type="submit">Send</button>
      </form>
      <p style={{fontSize:'0.9em',color:'#d4af37'}}>Note: Real-time chat requires backend WebSocket (socket.io) integration.</p>
    </div>
  );
}

export default ChatPage;
