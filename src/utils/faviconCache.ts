/**
 * IndexedDB-backed favicon cache shared by desktop & mobile.
 * Key: icon URL → { blob, ts }. TTL 7 days (expired entries are ignored).
 * Degrades gracefully when IndexedDB is unavailable (private mode) — callers
 * fall back to direct loading.
 */

const DB_NAME = 'mynav';
const STORE = 'icons';
const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
// Storage caps (security review MEDIUM): malicious bookmarks must not be able
// to exhaust the user's quota.
const MAX_BLOB_BYTES = 256 * 1024; // 256 KB per icon is plenty
const MAX_ENTRIES = 500;

interface CacheEntry {
    blob: Blob;
    ts: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

const openDb = (): Promise<IDBDatabase | null> => {
    if (dbPromise) return dbPromise;
    // NOTE: once it resolves to null (private mode / blocked), it stays null —
    // callers degrade to direct loading for the rest of the session.
    dbPromise = new Promise(resolve => {
        try {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains(STORE)) {
                    req.result.createObjectStore(STORE);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
            req.onblocked = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
    return dbPromise;
};

/** Returns a fresh object URL for the cached icon, or null on miss/expired. */
export const getCachedIcon = async (url: string): Promise<string | null> => {
    try {
        const db = await openDb();
        if (!db) return null;
        const entry: CacheEntry | undefined = await new Promise(resolve => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(url);
            req.onsuccess = () => resolve(req.result as CacheEntry | undefined);
            req.onerror = () => resolve(undefined);
        });
        if (!entry) return null;
        if (Date.now() - entry.ts >= TTL) return null; // expired → treat as miss
        return URL.createObjectURL(entry.blob);
    } catch {
        return null;
    }
};

/** Persist a fetched icon blob. Silently ignores failures and oversized blobs. */
export const setCachedIcon = async (url: string, blob: Blob) => {
    if (blob.size > MAX_BLOB_BYTES) return; // skip oversized blobs
    try {
        const db = await openDb();
        if (!db) return;
        const entry: CacheEntry = { blob, ts: Date.now() };
        await new Promise<void>(resolve => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            // Enforce the entry cap: evict arbitrary entries (key order) beyond
            // the max — only the count matters for the quota guard.
            const countReq = store.count();
            countReq.onsuccess = () => {
                // put runs AFTER the eviction cursor is exhausted, so a newly
                // written key can never be immediately evicted by its own pass.
                const finishPut = () => store.put(entry, url);
                if (countReq.result >= MAX_ENTRIES) {
                    let toDelete = countReq.result - MAX_ENTRIES + 1;
                    const cursorReq = store.openCursor();
                    cursorReq.onsuccess = () => {
                        const cursor = cursorReq.result;
                        if (cursor && toDelete > 0) {
                            cursor.delete();
                            toDelete--;
                            cursor.continue();
                        } else {
                            finishPut(); // cursor exhausted or nothing to delete
                        }
                    };
                } else {
                    finishPut();
                }
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
            tx.onabort = () => resolve();
        });
    } catch { /* ignore */ }
};
