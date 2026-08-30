/**
 * Persist in-memory fallback database to data/store/database.json
 */
const localFileStore = require('./localFileStore');

const STORE_FILE = 'store/database.json';
let saveTimer = null;
let persistEnabled = process.env.LOCAL_STORE_SYNC !== 'false';

function serializeStore(store) {
  return JSON.parse(
    JSON.stringify(store, (_key, value) => (value instanceof Date ? value.toISOString() : value))
  );
}

async function loadInto(targetStore) {
  const data = await localFileStore.readJson(STORE_FILE, null);
  if (!data || typeof data !== 'object') return false;

  for (const key of Object.keys(data)) {
    if (Object.prototype.hasOwnProperty.call(targetStore, key)) {
      targetStore[key] = data[key];
    }
  }
  return true;
}

function schedulePersist(store) {
  if (!persistEnabled) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await localFileStore.writeJson(STORE_FILE, serializeStore(store));
    } catch (err) {
      console.warn('⚠️ Local store sync failed:', err.message);
    }
  }, 2000);
}

async function flushPersist(store) {
  if (!persistEnabled) return;
  clearTimeout(saveTimer);
  await localFileStore.writeJson(STORE_FILE, serializeStore(store));
}

module.exports = {
  loadInto,
  schedulePersist,
  flushPersist,
  persistImmediate: flushPersist,
  STORE_FILE,
};
