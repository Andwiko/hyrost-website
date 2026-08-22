/**
 * Hyrost — secure local file storage (outside public web root).
 * data/store   → JSON fallback database
 * data/uploads → user-uploaded media
 * data/backups → encrypted MySQL snapshots
 * data/cache   → temporary files
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(
  process.env.LOCAL_DATA_DIR || path.join(__dirname, '../../data')
);

const SUBDIRS = ['store', 'uploads', 'backups', 'cache'];

function resolveSafe(...segments) {
  const full = path.resolve(ROOT, ...segments);
  const rootWithSep = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
  if (full !== ROOT && !full.startsWith(rootWithSep)) {
    throw new Error('Path traversal blocked');
  }
  return full;
}

function getUploadsDir() {
  return resolveSafe('uploads');
}

function getBackupsDir() {
  return resolveSafe('backups');
}

function getStoreDir() {
  return resolveSafe('store');
}

function safeFilename(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const useExt = allowed.includes(ext) ? ext : '.bin';
  return crypto.randomBytes(16).toString('hex') + useExt;
}

function isSafeMediaFilename(name) {
  if (!name || typeof name !== 'string') return false;
  const base = path.basename(name);
  return /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|gif|webp)$/i.test(base);
}

async function ensureDirs() {
  await fsp.mkdir(ROOT, { recursive: true, mode: 0o750 });
  for (const dir of SUBDIRS) {
    await fsp.mkdir(resolveSafe(dir), { recursive: true, mode: 0o750 });
  }
  await migrateLegacyUploads();
}

async function migrateLegacyUploads() {
  const legacyDir = path.join(__dirname, '../../uploads');
  const targetDir = getUploadsDir();
  if (!fs.existsSync(legacyDir)) return;

  let files;
  try {
    files = await fsp.readdir(legacyDir);
  } catch {
    return;
  }

  for (const file of files) {
    if (!isSafeMediaFilename(file)) continue;
    const src = path.join(legacyDir, file);
    const dst = path.join(targetDir, file);
    try {
      if (!fs.existsSync(dst) && fs.statSync(src).isFile()) {
        await fsp.copyFile(src, dst);
      }
    } catch (_) {}
  }
}

async function writeJson(relativePath, data) {
  const filePath = resolveSafe(relativePath);
  await fsp.mkdir(path.dirname(filePath), { recursive: true, mode: 0o750 });
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  const payload = JSON.stringify(data);
  await fsp.writeFile(tmp, payload, { encoding: 'utf8', mode: 0o600 });
  await fsp.rename(tmp, filePath);
  return filePath;
}

async function readJson(relativePath, defaultValue = null) {
  try {
    const filePath = resolveSafe(relativePath);
    const raw = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function deriveBackupKey() {
  const secret = process.env.LOCAL_BACKUP_KEY || process.env.JWT_SECRET || 'hyrost-dev-backup-key';
  return crypto.scryptSync(String(secret), 'hyrost-backup-v1', 32);
}

function encryptBuffer(plainBuffer) {
  const key = deriveBackupKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from('HYBK1'), iv, tag, encrypted]);
}

function decryptBuffer(encBuffer) {
  const magic = encBuffer.subarray(0, 5).toString('ascii');
  if (magic !== 'HYBK1') throw new Error('Invalid backup format');
  const iv = encBuffer.subarray(5, 17);
  const tag = encBuffer.subarray(17, 33);
  const data = encBuffer.subarray(33);
  const key = deriveBackupKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

async function writeSecureBackup(filename, jsonObject) {
  const dir = getBackupsDir();
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(dir, safeName);
  if (!filePath.startsWith(dir + path.sep)) throw new Error('Invalid backup path');

  const plain = Buffer.from(JSON.stringify(jsonObject), 'utf8');
  const useEncryption = process.env.LOCAL_BACKUP_ENCRYPT !== 'false';
  const out = useEncryption ? encryptBuffer(plain) : plain;
  const ext = useEncryption ? '.hybk' : '.json';
  const finalPath = filePath.endsWith(ext) ? filePath : filePath + ext;
  const tmp = `${finalPath}.tmp.${process.pid}`;
  await fsp.writeFile(tmp, out, { mode: 0o600 });
  await fsp.rename(tmp, finalPath);
  return finalPath;
}

async function pruneBackups(keep = 7) {
  const dir = getBackupsDir();
  let files;
  try {
    files = await fsp.readdir(dir);
  } catch {
    return;
  }

  const entries = [];
  for (const file of files) {
    if (!/\.(hybk|json)$/i.test(file)) continue;
    const full = path.join(dir, file);
    try {
      const stat = await fsp.stat(full);
      if (stat.isFile()) entries.push({ full, mtime: stat.mtimeMs });
    } catch (_) {}
  }

  entries.sort((a, b) => b.mtime - a.mtime);
  for (const entry of entries.slice(Math.max(keep, 1))) {
    await fsp.unlink(entry.full).catch(() => {});
  }
}

module.exports = {
  ROOT,
  ensureDirs,
  resolveSafe,
  getUploadsDir,
  getBackupsDir,
  getStoreDir,
  safeFilename,
  isSafeMediaFilename,
  writeJson,
  readJson,
  writeSecureBackup,
  decryptBuffer,
  pruneBackups,
};
