const mongoose = require('mongoose');

const BadgeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  awardedAt: {
    type: Date,
    default: Date.now
  }
});

// Static method to award a badge if not already awarded
BadgeSchema.statics.awardBadge = async function(userId, badgeName) {
  try {
    const existingBadge = await this.findOne({ userId, name: badgeName });
    if (!existingBadge) {
      await this.create({ userId, name: badgeName });
      return true; // Awarded
    }
    return false; // Already exists
  } catch (error) {
    console.error('Error awarding badge:', error);
    return false;
  }
};

module.exports = mongoose.model('Badge', BadgeSchema);
