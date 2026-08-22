const TTL_MS = 45 * 1000;
const visitors = new Map();

function cleanup(now = Date.now()) {
  for (const [id, lastSeen] of visitors) {
    if (now - lastSeen > TTL_MS) visitors.delete(id);
  }
}

exports.touch = (visitorId) => {
  if (!visitorId || typeof visitorId !== 'string') return 0;
  cleanup();
  visitors.set(visitorId.slice(0, 64), Date.now());
  return visitors.size;
};

exports.count = () => {
  cleanup();
  return visitors.size;
};
