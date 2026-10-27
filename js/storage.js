/**
 * IndexedDB Storage Layer for OGame Universe Merger
 * Handles persistent client-side storage of parsed universe datasets.
 */

const DB_NAME = 'OGameMergerDB';
const DB_VERSION = 1;
const STORE_NAME = 'universes';

export class UniverseStorage {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'uniKey' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject(new Error(`Error al abrir IndexedDB: ${event.target.error}`));
      };
    });
  }

  /**
   * Save or update a parsed universe
   */
  async saveUniverse(universeData) {
    await this.initPromise;

    // Convert Maps to plain objects/arrays for structured clone compatibility
    const serializable = {
      uniKey: universeData.uniKey,
      community: universeData.community,
      uniNumber: universeData.uniNumber,
      role: universeData.role || 'exodus',
      savedAt: Date.now(),
      serverData: universeData.serverData,
      alliances: Array.from(universeData.alliances.entries()),
      players: Array.from(universeData.players.entries()),
      planets: universeData.planets
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put(serializable);

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(new Error(`Fallo guardando universo en IndexedDB: ${e.target.error}`));
    });
  }

  /**
   * Get universe by key (e.g., 'es_190') and reconstruct Map structures
   */
  async getUniverse(uniKey) {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(uniKey);

      req.onsuccess = () => {
        const data = req.result;
        if (!data) {
          resolve(null);
          return;
        }

        // Rehydrate Maps
        const hydrated = {
          uniKey: data.uniKey,
          community: data.community,
          uniNumber: data.uniNumber,
          role: data.role || 'exodus',
          serverData: data.serverData,
          alliances: new Map(data.alliances),
          players: new Map(data.players),
          planets: data.planets
        };
        resolve(hydrated);
      };

      req.onerror = (e) => reject(new Error(`Fallo recuperando universo: ${e.target.error}`));
    });
  }

  /**
   * Retrieve all saved universes
   */
  async getAllUniverses() {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = req.result || [];
        const hydratedList = list.map(data => ({
          uniKey: data.uniKey,
          community: data.community,
          uniNumber: data.uniNumber,
          role: data.role || 'exodus',
          savedAt: data.savedAt,
          serverData: data.serverData,
          alliances: new Map(data.alliances),
          players: new Map(data.players),
          planets: data.planets
        }));
        resolve(hydratedList);
      };

      req.onerror = (e) => reject(new Error(`Fallo listando universos: ${e.target.error}`));
    });
  }

  /**
   * Delete a single universe from IndexedDB
   */
  async deleteUniverse(uniKey) {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(uniKey);

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(new Error(`Fallo eliminando universo: ${e.target.error}`));
    });
  }

  /**
   * Clear all stored universes
   */
  async clearAll() {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(new Error(`Fallo limpiando base de datos: ${e.target.error}`));
    });
  }
}
