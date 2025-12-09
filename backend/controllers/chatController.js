const Message = require('../models/Message');

exports.sendMessage = async (req, res) => {
  try {
    const { content, receiverId, groupId } = req.body;
    const senderId = req.user.id; // Assuming auth middleware sets req.user
    const message = new Message({ content, senderId, receiverId, groupId });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { receiverId } = req.query;
    const senderId = req.user.id;
    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
