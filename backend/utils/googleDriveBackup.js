/**
 * Upload encrypted backups to Google Drive (service account).
 *
 * Setup:
 * 1. Google Cloud Console → enable Drive API → create Service Account → download JSON key
 * 2. Save JSON to credentials/google-drive-service-account.json
 * 3. Create Drive folder → Share with service account email (Editor)
 * 4. Set GOOGLE_DRIVE_FOLDER_ID + GOOGLE_DRIVE_ENABLED=true in .env
 */
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const BACKUP_PREFIX = 'hyrost-backup-';

let driveClient = null;
let serviceAccountEmail = null;

function isEnabled() {
  return process.env.GOOGLE_DRIVE_ENABLED === 'true'
    && !!process.env.GOOGLE_DRIVE_FOLDER_ID
    && !!resolveCredentialsPath();
}

function resolveCredentialsPath() {
  const raw = process.env.GOOGLE_DRIVE_CREDENTIALS || 'credentials/google-drive-service-account.json';
  if (path.isAbsolute(raw)) return raw;
  return path.resolve(__dirname, '../..', raw);
}

function getFolderId() {
  return (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
}

async function getDrive() {
  if (driveClient) return driveClient;

  const credPath = resolveCredentialsPath();
  if (!fs.existsSync(credPath)) {
    throw new Error(`Google Drive credentials not found: ${credPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  serviceAccountEmail = raw.client_email || null;

  const auth = new google.auth.GoogleAuth({
    keyFile: credPath,
    scopes: SCOPES,
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

async function uploadBackupFile(localFilePath) {
  if (!isEnabled()) return null;

  const folderId = getFolderId();
  const drive = await getDrive();
  const baseName = path.basename(localFilePath);
  const remoteName = BACKUP_PREFIX + baseName.replace(/^backup-/, '');

  const res = await drive.files.create({
    requestBody: {
      name: remoteName,
      parents: [folderId],
      description: `Hyrost encrypted backup — ${new Date().toISOString()}`,
    },
    media: {
      mimeType: 'application/octet-stream',
      body: fs.createReadStream(localFilePath),
    },
    fields: 'id, name, webViewLink, createdTime',
  });

  console.log(`☁️  Google Drive backup uploaded: ${res.data.name} (${res.data.id})`);
  return res.data;
}

async function listBackupFiles() {
  const folderId = getFolderId();
  const drive = await getDrive();

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false and name contains '${BACKUP_PREFIX}'`,
    fields: 'files(id, name, createdTime, size)',
    orderBy: 'createdTime desc',
    pageSize: 100,
  });

  return res.data.files || [];
}

async function pruneOldBackups() {
  if (!isEnabled()) return;

  const keep = Math.max(1, parseInt(process.env.GOOGLE_DRIVE_KEEP || '14', 10));
  const files = await listBackupFiles();

  for (const file of files.slice(keep)) {
    try {
      const drive = await getDrive();
      await drive.files.delete({ fileId: file.id });
      console.log(`☁️  Google Drive pruned old backup: ${file.name}`);
    } catch (err) {
      console.warn(`⚠️ Drive prune failed (${file.name}):`, err.message);
    }
  }
}

async function verifyConnection() {
  if (!isEnabled()) {
    return { ok: false, reason: 'disabled' };
  }

  try {
    const folderId = getFolderId();
    const drive = await getDrive();
    await drive.files.get({ fileId: folderId, fields: 'id, name' });
    return {
      ok: true,
      folderId,
      serviceAccount: serviceAccountEmail,
    };
  } catch (err) {
    return {
      ok: false,
      reason: err.message,
      serviceAccount: serviceAccountEmail,
    };
  }
}

function logStartupStatus() {
  if (process.env.GOOGLE_DRIVE_ENABLED !== 'true') {
    console.log('ℹ️  Google Drive backup disabled (set GOOGLE_DRIVE_ENABLED=true to enable)');
    return;
  }

  verifyConnection().then((result) => {
    if (result.ok) {
      console.log(`☁️  Google Drive backup ready → folder ${result.folderId}`);
      if (result.serviceAccount) {
        console.log(`   Service account: ${result.serviceAccount}`);
      }
    } else {
      console.warn(`⚠️ Google Drive not ready: ${result.reason}`);
      if (result.serviceAccount) {
        console.warn(`   Pastikan folder Drive di-share ke: ${result.serviceAccount}`);
      }
    }
  }).catch(() => {});
}

module.exports = {
  isEnabled,
  uploadBackupFile,
  pruneOldBackups,
  listBackupFiles,
  verifyConnection,
  logStartupStatus,
  resolveCredentialsPath,
};
