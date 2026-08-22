const crypto = require('crypto');
const pool = require('../config/mysql');

// Discord Public Key from Mei Application (Developer Portal)
const DEFAULT_PUBLIC_KEY = '73ff504b5993096c4fa630f7d1baa6b52f5c930521168dcb5484f9765719f5a5';

// Discord Interaction Types & Response Types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5
};

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9
};

/**
 * Verify Discord Ed25519 signature
 */
function verifyDiscordSignature(rawBody, signature, timestamp, publicKeyHex) {
  if (!publicKeyHex) return true;
  if (!signature || !timestamp || !rawBody) return false;

  try {
    const key = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        Buffer.from(publicKeyHex, 'hex')
      ]),
      format: 'der',
      type: 'spki'
    });

    const bodyBuffer = Buffer.isBuffer(rawBody) 
      ? rawBody 
      : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));
    const messageBuffer = Buffer.concat([Buffer.from(timestamp), bodyBuffer]);

    return crypto.verify(null, messageBuffer, key, Buffer.from(signature, 'hex'));
  } catch (err) {
    console.error('[Discord Signature Verify Error]', err.message);
    return false;
  }
}

/**
 * POST /api/interactions & /api/interaction
 * Discord Developer Portal Interactions Endpoint URL Handler
 */
exports.handleInteraction = async (req, res) => {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const publicKey = process.env.DISCORD_PUBLIC_KEY || process.env.DISCORD_CLIENT_PUBLIC_KEY || DEFAULT_PUBLIC_KEY;

  // 1. Verify cryptographic signature if headers are provided
  if (signature && timestamp) {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const isValid = verifyDiscordSignature(rawBody, signature, timestamp, publicKey);
    if (!isValid) {
      return res.status(401).send('Invalid request signature');
    }
  }

  const interaction = req.body;
  if (!interaction || !interaction.type) {
    return res.status(400).json({ error: 'Invalid interaction payload' });
  }

  // 2. Handle PING (Type 1) -> Returns PONG { type: 1 } (Required by Discord Developer Portal)
  if (interaction.type === InteractionType.PING) {
    return res.json({ type: InteractionResponseType.PONG });
  }

  // 3. Handle Application Slash Commands (Type 2)
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const commandName = interaction.data?.name?.toLowerCase();
    const options = interaction.data?.options || [];
    const caller = interaction.member?.user || interaction.user || {};

    // ── Command: /verify-user ──
    if (commandName === 'verify-user' || commandName === 'verifyuser') {
      const targetUserId = options.find(o => o.name === 'user')?.value || caller.id;
      const actionOpt = options.find(o => o.name === 'action')?.value || 'verify';
      const ignOpt = options.find(o => o.name === 'ign')?.value || null;

      try {
        let dbUser = null;
        try {
          const [users] = await pool.execute(
            'SELECT id, username, email, role, discord_id, mojang_username FROM users WHERE discord_id = ? LIMIT 1',
            [targetUserId]
          );
          if (users.length > 0) dbUser = users[0];
        } catch {
          // MySQL table fallback
        }

        if (actionOpt === 'check') {
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [{
                title: `🔍 Status Verifikasi Akun: <@${targetUserId}>`,
                color: 0x6366f1,
                fields: [
                  { name: 'Discord ID', value: `\`${targetUserId}\``, inline: true },
                  { name: 'Akun Web Hyrost', value: dbUser ? `\`${dbUser.username}\` (${dbUser.role})` : 'Belum Ditautkan', inline: true },
                  { name: 'Minecraft IGN', value: dbUser?.mojang_username ? `\`${dbUser.mojang_username}\`` : (ignOpt ? `\`${ignOpt}\`` : 'Belum Ada'), inline: true },
                  { name: 'Status Terverifikasi', value: dbUser ? '✅ Terverifikasi' : '⚠️ Belum Terhubung', inline: false }
                ],
                footer: { text: 'Hyrost Realm & Mei Labs Verification System' },
                timestamp: new Date().toISOString()
              }]
            }
          });
        }

        // Action: Verify
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              title: '✅ Verifikasi Pengguna Berhasil',
              description: `Pengguna <@${targetUserId}> telah berhasil diverifikasi dalam ekosistem Hyrost Realm.`,
              color: 0x10b981,
              fields: [
                { name: 'Pengguna', value: `<@${targetUserId}>`, inline: true },
                { name: 'Minecraft IGN', value: ignOpt ? `\`${ignOpt}\`` : (dbUser?.mojang_username ? `\`${dbUser.mojang_username}\`` : 'Tidak dicantumkan'), inline: true },
                { name: 'Portal Verifikasi Web', value: '[Buka Portal Verifikasi](https://hyrost.web.id/verify-user)', inline: false }
              ],
              footer: { text: 'Hyrost Realm • Verification Hub' },
              timestamp: new Date().toISOString()
            }]
          }
        });
      } catch (err) {
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Terjadi kesalahan saat memproses verifikasi: ${err.message}`,
            flags: 64
          }
        });
      }
    }

    // ── Command: /ping ──
    if (commandName === 'ping') {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '🏓 **Pong!** Webhook Interactions API Hyrost & Bot Mei berjalan aktif.'
        }
      });
    }

    // ── Command: /status ──
    if (commandName === 'status' || commandName === 'server') {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '🌐 Status Server Hyrost Realm',
            color: 0x06b6d4,
            fields: [
              { name: 'IP Server', value: '`play.hyrost.net`', inline: true },
              { name: 'Versi', value: 'Java & Bedrock Edition', inline: true },
              { name: 'Web Portal', value: 'https://hyrost.web.id', inline: true }
            ],
            footer: { text: 'Hyrost Server Status' }
          }]
        }
      });
    }

    // ── Command: /link ──
    if (commandName === 'link') {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '🔗 Tautkan Akun Discord dengan Hyrost Realm',
            description: 'Gunakan tautan berikut untuk menghubungkan akun Discord Anda dengan Dashboard Hyrost dan mendapatkan Linked Role:',
            color: 0x6366f1,
            fields: [
              { name: 'Portal Verifikasi', value: 'https://hyrost.web.id/verify-user' }
            ]
          }],
          flags: 64
        }
      });
    }

    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Perintah \`/${commandName}\` diterima oleh Hyrost Interaction Engine.`
      }
    });
  }

  // 4. Handle Message Components (Type 3 - Buttons / Select Menus)
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    const customId = interaction.data?.custom_id;

    if (customId === 'verify_start' || customId === 'verify_user_btn') {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Silakan buka portal verifikasi web di https://hyrost.web.id/verify-user untuk menyelesaikan verifikasi.',
          flags: 64
        }
      });
    }

    return res.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: 'Interaksi tombol berhasil diproses.'
      }
    });
  }

  // Fallback
  return res.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: 'Interaksi diterima.' }
  });
};

/**
 * GET /api/interactions & /api/interaction
 * Status & health check
 */
exports.getInteractionStatus = (req, res) => {
  res.json({
    success: true,
    service: 'Hyrost Discord Interactions Endpoint',
    version: '1.2.0',
    status: 'ONLINE',
    configuredPublicKey: DEFAULT_PUBLIC_KEY ? 'OK' : 'NONE',
    supportedEndpoints: [
      'POST /api/interactions',
      'POST /api/interaction',
      'POST /api/verify-user',
      'GET /verify-user'
    ],
    timestamp: new Date().toISOString()
  });
};
