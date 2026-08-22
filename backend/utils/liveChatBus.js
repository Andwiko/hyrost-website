const subscribers = new Set();

exports.subscribe = (res) => {
  subscribers.add(res);
  res.on('close', () => subscribers.delete(res));
};

exports.publish = (event) => {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of subscribers) {
    try {
      res.write(payload);
    } catch (_) {
      subscribers.delete(res);
    }
  }
};

exports.subscriberCount = () => subscribers.size;
