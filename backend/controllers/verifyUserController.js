const pool = require('../config/mysql');

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID || '1391337610156445766';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET || '';

// In-Memory store for temporary verification codes
const verificationCodeStore = new Map();

/**
 * Generate a 6-character verification code
 */
function generateRandomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * GET /api/verify-user/discord-oauth
 * Generates Discord OAuth2 URL for Linked Roles Verification
 */
exports.getDiscordOAuthUrl = (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const redirectUri = encodeURIComponent(`${protocol}://${host}/api/verify-user/callback`);
  
  const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&scope=identify%20role_connections.write`;
  
  if (req.query.format === 'json') {
    return res.json({ success: true, url: oauthUrl });
  }
  
  res.redirect(oauthUrl);
};

/**
 * GET /api/verify-user/callback
 * Handles OAuth2 Code exchange & Discord Linked Role registration
 */
exports.handleDiscordOAuthCallback = async (req, res) => {
  const { code } = req.query;
  const host = req.get('host');
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const redirectUri = `${protocol}://${host}/api/verify-user/callback`;

  if (!code) {
    return res.redirect('/verify-user.html?error=no_code');
  }

  try {
    if (!DISCORD_CLIENT_SECRET) {
      // If client secret is not configured yet in .env, redirect to verify-user with notification
      return res.redirect('/verify-user.html?status=oauth_received&notice=secret_setup');
    }

    // 1. Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return res.redirect('/verify-user.html?error=token_exchange_failed');
    }

    // 2. Fetch Discord user details
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });
    const discordUser = await userRes.json();

    // 3. Update Database (Link Discord ID to user)
    const currentUserId = req.user?.id;
    if (currentUserId && discordUser.id) {
      await pool.execute(
        'UPDATE users SET discord_id = ? WHERE id = ?',
        [discordUser.id, currentUserId]
      ).catch(() => null);
    }

    // 4. Update Discord Role Connection Metadata
    await fetch(`https://discord.com/api/v10/users/@me/applications/${DISCORD_CLIENT_ID}/role-connection`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        platform_name: 'Hyrost Realm',
        platform_username: discordUser.username,
        metadata: {
          is_verified: 1
        }
      })
    }).catch(err => console.warn('[Linked Roles Metadata Push Warning]', err.message));

    return res.redirect(`/verify-user.html?status=success&discord=${encodeURIComponent(discordUser.username)}`);
  } catch (err) {
    console.error('[Discord OAuth Callback Error]', err);
    res.redirect(`/verify-user.html?error=${encodeURIComponent(err.message)}`);
  }
};

/**
 * POST /api/verify-user/generate-code
 * Creates temporary verification code
 */
exports.generateVerificationCode = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { discordId, ign } = req.body;

    const code = generateRandomCode();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    verificationCodeStore.set(code, {
      userId: userId || null,
      discordId: discordId || null,
      ign: ign || null,
      expiresAt
    });

    res.json({
      success: true,
      code,
      expiresInSeconds: 900,
      instructions: `Masukkan kode ini di halaman /verify-user atau gunakan bot Discord untuk verifikasi.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/verify-user
 * Verifies user with code, Discord ID, or Minecraft IGN
 */
exports.verifyUser = async (req, res) => {
  try {
    const { code, discordId, ign, username, email } = req.body;
    const currentUserId = req.user?.id;

    // 1. Verification by Code
    if (code) {
      const cleanCode = String(code).trim().toUpperCase();
      const codeData = verificationCodeStore.get(cleanCode);

      if (!codeData) {
        return res.status(400).json({
          success: false,
          message: 'Kode verifikasi tidak valid atau telah kedaluwarsa.'
        });
      }

      if (Date.now() > codeData.expiresAt) {
        verificationCodeStore.delete(cleanCode);
        return res.status(400).json({
          success: false,
          message: 'Kode verifikasi telah kedaluwarsa. Silakan minta kode baru.'
        });
      }

      const targetUserId = currentUserId || codeData.userId;
      const targetDiscord = discordId || codeData.discordId;
      const targetIgn = ign || codeData.ign;

      if (targetUserId) {
        let updates = [];
        let params = [];

        if (targetDiscord) {
          updates.push('discord_id = ?');
          params.push(targetDiscord);
        }
        if (targetIgn) {
          updates.push('mojang_username = ?');
          params.push(targetIgn);
        }

        if (updates.length > 0) {
          params.push(targetUserId);
          await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params).catch(() => null);
        }
      }

      verificationCodeStore.delete(cleanCode);

      return res.json({
        success: true,
        message: 'Verifikasi akun Hyrost berhasil diselesaikan!',
        verifiedData: {
          userId: targetUserId,
          discordId: targetDiscord,
          ign: targetIgn
        }
      });
    }

    // 2. Direct Verification by Discord ID, IGN, or Username
    if (discordId || ign || username || email) {
      let query = 'SELECT id, username, email, role, discord_id, mojang_username FROM users WHERE ';
      let params = [];

      if (discordId) {
        query += 'discord_id = ?';
        params.push(discordId);
      } else if (ign) {
        query += 'mojang_username = ?';
        params.push(ign);
      } else if (username) {
        query += 'username = ?';
        params.push(username);
      } else if (email) {
        query += 'email = ?';
        params.push(email);
      }

      let users = [];
      try {
        const [rows] = await pool.execute(query, params);
        users = rows;
      } catch {
        // DB fallback
      }

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Data akun tidak ditemukan untuk diverifikasi.'
        });
      }

      const user = users[0];

      return res.json({
        success: true,
        message: 'Pengguna terverifikasi dalam ekosistem Hyrost.',
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          discordId: user.discord_id,
          mojangUsername: user.mojang_username,
          isVerified: true
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Harap sertakan kode verifikasi, Discord ID, atau username.'
    });
  } catch (err) {
    console.error('[Verify User Error]', err);
    res.status(500).json({ success: false, message: 'Server error saat memproses verifikasi.' });
  }
};

/**
 * GET /api/verify-user/status/:id
 * Check verification status
 */
exports.getVerificationStatus = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'ID diperlukan' });

    let users = [];
    try {
      const [rows] = await pool.execute(
        'SELECT id, username, email, role, discord_id, mojang_username, created_at FROM users WHERE discord_id = ? OR id = ? OR username = ? LIMIT 1',
        [id, id, id]
      );
      users = rows;
    } catch {
      // Fallback
    }

    if (users.length === 0) {
      return res.json({
        success: true,
        isVerified: false,
        message: 'Pengguna belum terhubung dengan akun Hyrost.'
      });
    }

    const user = users[0];
    res.json({
      success: true,
      isVerified: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        discordId: user.discord_id,
        mojangUsername: user.mojang_username,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
