const Thread = require('../models/Thread');
const Vote = require('../models/Vote');
const Badge = require('../models/Badge');

// Enhanced Forum Controller
exports.createThread = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const userId = req.user.id;
    
    const thread = new Thread({ 
      title, 
      content, 
      category, 
      userId,
      status: 'active',
      tags: []
    });
    
    await thread.save();
    
    // Award badge for first post
    const userPosts = await Thread.countDocuments({ userId });
    if (userPosts === 1) {
      await Badge.awardBadge(userId, 'first-post');
    }
    
    res.status(201).json(thread);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.replyThread = async (req, res) => {
  try {
    const { threadId, content } = req.body;
    const userId = req.user.id;

    const thread = await Thread.findById(threadId);

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const newReply = {
      userId,
      content,
    };

    thread.replies.push(newReply);
    await thread.save();

    res.status(201).json(thread);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listThreads = async (req, res) => {
  try {
    const threads = await Thread.find().populate('userId', 'username');
    res.json(threads);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listCategories = async (req, res) => {
  // Implement category listing
  res.json(['General', 'Tech', 'Gaming']);
};

// Vote Module
exports.voteThread = async (req, res) => {
  try {
    const { threadId, voteType } = req.body;
    const userId = req.user.id;
    
    // Check if user already voted
    const existingVote = await Vote.findOne({ threadId, userId });
    
    if (existingVote) {
      return res.status(400).json({ message: 'You already voted on this thread' });
    }
    
    const vote = new Vote({ threadId, userId, voteType });
    await vote.save();
    
    // Update thread vote count
    await Thread.findByIdAndUpdate(threadId, { 
      $inc: { [`votes.${voteType}`]: 1 }
    });
    
    res.status(201).json(vote);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Badges Module
exports.listUserBadges = async (req, res) => {
  try {
    const badges = await Badge.find({ userId: req.params.userId });
    res.json(badges);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};