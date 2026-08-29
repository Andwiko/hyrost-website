/**
 * Google Drive Media Uploader Utility for Hyrost Realm
 * Uploads user media (showcase builds, avatars, products) to Google Drive and sets public read permissions.
 */

const fs = require('fs');
const path = require('path');
let google = null;
try {
  google = require('googleapis').google;
} catch (_) {}

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

let driveClient = null;

function isDriveEnabled() {
  const enabled = process.env.GOOGLE_DRIVE_ENABLED === 'true';
  const hasFolder = !!(process.env.GOOGLE_DRIVE_UPLOADS_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID);
  const credPath = resolveCredentialsPath();
  return enabled && hasFolder && fs.existsSync(credPath);
}

function resolveCredentialsPath() {
  const raw = process.env.GOOGLE_DRIVE_CREDENTIALS || 'credentials/google-drive-service-account.json';
  if (path.isAbsolute(raw)) return raw;
  return path.resolve(__dirname, '../..', raw);
}

function getUploadFolderId() {
  return (process.env.GOOGLE_DRIVE_UPLOADS_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
}

async function getDriveClient() {
  if (driveClient) return driveClient;

  const credPath = resolveCredentialsPath();
  if (!fs.existsSync(credPath)) {
    throw new Error(`Google Drive credentials file not found: ${credPath}`);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: credPath,
    scopes: SCOPES,
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

/**
 * Upload a media file to Google Drive and generate direct viewable URL
 * @param {string} localFilePath - Path to local file
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<{fileId: string, webViewLink: string, directUrl: string, size: number}>}
 */
async function uploadMediaToDrive(localFilePath, originalName, mimeType = 'image/jpeg') {
  if (!isDriveEnabled()) {
    return null;
  }

  try {
    const drive = await getDriveClient();
    const folderId = getUploadFolderId();
    const safeName = `hyrost_upload_${Date.now()}_${path.basename(originalName)}`;

    // 1. Upload File to Google Drive
    const res = await drive.files.create({
      requestBody: {
        name: safeName,
        parents: folderId ? [folderId] : undefined,
        description: `Hyrost user media upload - ${originalName}`,
      },
      media: {
        mimeType: mimeType || 'application/octet-stream',
        body: fs.createReadStream(localFilePath),
      },
      fields: 'id, name, webViewLink, webContentLink, size',
    });

    const fileId = res.data.id;

    // 2. Set Public Read Permission so the image can be embedded on the website
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permErr) {
      console.warn('⚠️ Google Drive permission grant notice:', permErr.message);
    }

    // Direct embeddable link via Google Usercontent CDN
    const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

    console.log(`☁️  [Google Drive] File uploaded successfully: ${safeName} (ID: ${fileId})`);

    return {
      fileId,
      webViewLink: res.data.webViewLink,
      directUrl,
      size: parseInt(res.data.size, 10) || 0,
    };
  } catch (err) {
    console.error('❌ Google Drive upload failed:', err);
    return null;
  }
}

module.exports = {
  isDriveEnabled,
  uploadMediaToDrive,
  getUploadFolderId
};
