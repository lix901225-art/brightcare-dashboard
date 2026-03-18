/**
 * Offline queue — stores failed API writes in IndexedDB
 * and syncs them when connectivity returns via Background Sync API.
 */

const DB_NAME = "brightcare-offline";
const STORE_NAME = "queue";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineAction(action: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({ ...action, timestamp: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Request background sync if available
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).sync.register("brightcare-sync");
    }
  } catch {
    // IndexedDB not available, silently fail
  }
}

export async function getQueuedCount(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

/** Listen for online events and trigger sync */
export function setupOfflineSync() {
  if (typeof window === "undefined") return;

  window.addEventListener("online", async () => {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).sync.register("brightcare-sync");
    }
  });
}
