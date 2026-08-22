const pool = require('../config/mysql');
const adminController = require('./adminController');
const webPresence = require('../utils/webPresence');
const liveChatBus = require('../utils/liveChatBus');

async function fetchServerStatusData() {
  return Promise.race([
    new Promise((resolve) => {
      const mockRes = {
        json: (data) => resolve(data),
      };
      adminController.getServerStatus({}, mockRes).catch(() => {
        resolve({
          success: true,
          serverIp: 'play.hyrost.net',
          isOnline: false,
          onlinePlayers: 0,
          playerList: [],
        });
      });
    }),
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          serverIp: 'play.hyrost.net',
          isOnline: true,
          onlinePlayers: 0,
          playerList: [],
          cached: true,
        });
      }, 3500);
    }),
  ]);
}

async function fetchActivities() {
  return new Promise((resolve) => {
    const mockRes = {
      json: (data) => resolve(data.activities || []),
    };
    adminController.getPublicLiveActivity({}, mockRes).catch(() => resolve([]));
  });
}

async function fetchChatMessages(sinceId = 0) {
  try {
    if (sinceId > 0) {
      const [rows] = await pool.execute(
        'SELECT * FROM live_chats WHERE id > ? ORDER BY id ASC LIMIT 50',
        [sinceId]
      );
      return rows;
    }
    const [rows] = await pool.execute(
      'SELECT * FROM live_chats ORDER BY id DESC LIMIT 30'
    );
    return rows.reverse();
  } catch (_) {
    return [];
  }
}

async function fetchForumStats() {
  try {
    const [[row]] = await pool.execute(
      "SELECT COUNT(*) AS total FROM threads WHERE status = 'active'"
    );
    return { threadCount: row?.total || 0 };
  } catch (_) {
    return { threadCount: 0 };
  }
}

exports.getSnapshot = async (req, res) => {
  try {
    const sinceChat = parseInt(req.query.sinceChat || '0', 10);
    const visitorId = req.query.visitorId;

    if (visitorId) webPresence.touch(String(visitorId));

    const [server, activities, chatMessages, forumStats] = await Promise.all([
      fetchServerStatusData(),
      fetchActivities(),
      fetchChatMessages(sinceChat),
      fetchForumStats(),
    ]);

    const lastChatId = chatMessages.length
      ? chatMessages[chatMessages.length - 1].id
      : sinceChat;

    res.json({
      success: true,
      server,
      activities,
      chatMessages,
      lastChatId,
      forumStats,
      webOnline: webPresence.count(),
      sseOnline: liveChatBus.subscriberCount(),
      ts: Date.now(),
    });
  } catch (err) {
    console.error('LIVE HUB SNAPSHOT ERROR:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat data live hub' });
  }
};

exports.postPresence = (req, res) => {
  const visitorId = req.body?.visitorId || req.headers['x-visitor-id'];
  if (visitorId) webPresence.touch(String(visitorId));
  res.json({ success: true, webOnline: webPresence.count() });
};

exports.streamEvents = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'connected', ts: Date.now() })}\n\n`);

  liveChatBus.subscribe(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping ${Date.now()}\n\n`);
    } catch (_) {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => clearInterval(heartbeat));
};
