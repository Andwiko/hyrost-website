const mongoose = require('mongoose');

const StatisticSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  playTime: { type: Number, default: 0 },
  blocksBroken: { type: Number, default: 0 },
  mobsKilled: { type: Number, default: 0 },
  deaths: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Statistic', StatisticSchema);