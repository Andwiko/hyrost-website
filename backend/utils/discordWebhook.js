'use strict';

async function sendDiscordEmbed({ title, description, color = 0x6366f1, fields = [] }) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;

  try {
    const body = {
      embeds: [{
        title,
        description,
        color,
        fields: fields.slice(0, 10),
        timestamp: new Date().toISOString(),
        footer: { text: 'Hyrost Realm' },
      }],
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (err) {
    console.warn('Discord webhook failed:', err.message);
    return false;
  }
}

module.exports = { sendDiscordEmbed };
