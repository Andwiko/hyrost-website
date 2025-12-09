import React, { useState, useEffect } from 'react';
import { fetchThreads, createThread } from '../api/forum';

const ForumPage = () => {
  const [threads, setThreads] = useState([]);
  const [newThread, setNewThread] = useState({ title: '', content: '' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const loadThreads = async () => {
      const data = await fetchThreads();
      setThreads(data);
    };
    loadThreads();
  }, []);

  const handleCreateThread = async () => {
    const createdThread = await createThread(newThread);
    setThreads([...threads, createdThread]);
    setNewThread({ title: '', content: '' });
    setIsCreating(false);
  };

  return (
    <div className="forum-container">
      <h1>Forum Diskusi</h1>
      
      {!isCreating ? (
        <button onClick={() => setIsCreating(true)}>Buat Thread Baru</button>
      ) : (
        <div className="thread-form">
          <input
            type="text"
            placeholder="Judul Thread"
            value={newThread.title}
            onChange={(e) => setNewThread({...newThread, title: e.target.value})}
          />
          <textarea
            placeholder="Konten"
            value={newThread.content}
            onChange={(e) => setNewThread({...newThread, content: e.target.value})}
          />
          <button onClick={handleCreateThread}>Posting</button>
          <button onClick={() => setIsCreating(false)}>Batal</button>
        </div>
      )}

      <div className="thread-list">
        {threads.map(thread => (
          <div key={thread._id} className="thread-item">
            <h3>{thread.title}</h3>
            <p>{thread.content}</p>
            <span>Oleh: {thread.userId.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ForumPage;