import React, { useState } from 'react';
import { castVote } from '../api/vote';

const VoteButtons = ({ targetType, targetId, initialVotes }) => {
  const [votes, setVotes] = useState(initialVotes);
  const [userVote, setUserVote] = useState(null);

  const handleVote = async (voteType) => {
    try {
      const updatedVotes = await castVote(targetType, targetId, voteType);
      setVotes(updatedVotes);
      setUserVote(voteType);
    } catch (error) {
      console.error('Error casting vote:', error);
    }
  };

  return (
    <div className="vote-buttons">
      <button 
        className={`upvote ${userVote === 'up' ? 'active' : ''}`}
        onClick={() => handleVote('up')}
      >
        ▲ {votes.up}
      </button>
      <button 
        className={`downvote ${userVote === 'down' ? 'active' : ''}`}
        onClick={() => handleVote('down')}
      >
        ▼ {votes.down}
      </button>
    </div>
  );
};

export default VoteButtons;