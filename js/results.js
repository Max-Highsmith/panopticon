/* ===================================================================
   PANOPTICON — Browser-Side Results Storage (IndexedDB)
   Stores wargame run logs locally when running in browser mode.
   =================================================================== */

const DB_NAME = 'panopticon_results';
const STORE_NAME = 'runs';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'runId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveResult(runId, decisions, summary) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put({ runId, decisions, summary, timestamp: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function listResults() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const req = tx.objectStore(STORE_NAME).getAll();
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.timestamp - a.timestamp));
  });
}

export async function getResult(runId) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const req = tx.objectStore(STORE_NAME).get(runId);
  return new Promise((resolve) => { req.onsuccess = () => resolve(req.result); });
}
