/**
 * IndexedDB Storage Layer for OGame Universe Merger
 * Handles persistent client-side storage of parsed universe datasets and real-time drafts.
 */

const DB_NAME = 'OGameMergerDB';
const DB_VERSION = 2;
const STORE_NAME = 'universes';
const DRAFT_STORE_NAME = 'drafts';

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
        if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
          db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'uniKey' });
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
   * Save or update an incremental draft
   */
  async saveDraft(uniKey, draftData) {
    await this.initPromise;

    const serializable = {
      uniKey,
      community: draftData.community,
      uniNumber: draftData.uniNumber,
      role: draftData.role || 'exodus',
      updatedAt: Date.now(),
      endpointsTimestamp: draftData.endpointsTimestamp || {},
      serverData: draftData.serverData,
      alliances: draftData.alliances ? Array.from(draftData.alliances.entries()) : null,
      players: draftData.players ? Array.from(draftData.players.entries()) : null,
      planets: draftData.planets || null,
      highscores: draftData.highscores || {}
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([DRAFT_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(DRAFT_STORE_NAME);
      const req = store.put(serializable);

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(new Error(`Fallo guardando borrador en IndexedDB: ${e.target.error}`));
    });
  }

  /**
   * Retrieve incremental draft by universe key
   */
  async getDraft(uniKey) {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([DRAFT_STORE_NAME], 'readonly');
      const store = transaction.objectStore(DRAFT_STORE_NAME);
      const req = store.get(uniKey);

      req.onsuccess = () => {
        const data = req.result;
        if (!data) {
          resolve(null);
          return;
        }

        const hydrated = {
          uniKey: data.uniKey,
          community: data.community,
          uniNumber: data.uniNumber,
          role: data.role || 'exodus',
          updatedAt: data.updatedAt,
          endpointsTimestamp: data.endpointsTimestamp || {},
          serverData: data.serverData,
          alliances: data.alliances ? new Map(data.alliances) : null,
          players: data.players ? new Map(data.players) : null,
          planets: data.planets || null,
          highscores: data.highscores || {}
        };
        resolve(hydrated);
      };

      req.onerror = (e) => reject(new Error(`Fallo recuperando borrador: ${e.target.error}`));
    });
  }

  /**
   * Delete an incremental draft
   */
  async deleteDraft(uniKey) {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([DRAFT_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(DRAFT_STORE_NAME);
      const req = store.delete(uniKey);

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(new Error(`Fallo eliminando borrador: ${e.target.error}`));
    });
  }

  /**
   * Save or update a completed parsed universe
   */
  async saveUniverse(universeData) {
    await this.initPromise;

    const serializable = {
      uniKey: universeData.uniKey,
      community: universeData.community,
      uniNumber: universeData.uniNumber,
      role: universeData.role || 'exodus',
      savedAt: Date.now(),
      serverData: universeData.serverData,
      alliances: universeData.alliances instanceof Map ? Array.from(universeData.alliances.entries()) : (Array.isArray(universeData.alliances) ? universeData.alliances : []),
      players: universeData.players instanceof Map ? Array.from(universeData.players.entries()) : (Array.isArray(universeData.players) ? universeData.players : []),
      planets: Array.isArray(universeData.planets) ? universeData.planets : []
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

        const hydrated = {
          uniKey: data.uniKey,
          community: data.community,
          uniNumber: data.uniNumber,
          role: data.role || 'exodus',
          serverData: data.serverData,
          alliances: Array.isArray(data.alliances) ? new Map(data.alliances) : (data.alliances instanceof Map ? data.alliances : new Map()),
          players: Array.isArray(data.players) ? new Map(data.players) : (data.players instanceof Map ? data.players : new Map()),
          planets: Array.isArray(data.planets) ? data.planets : []
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
          alliances: Array.isArray(data.alliances) ? new Map(data.alliances) : (data.alliances instanceof Map ? data.alliances : new Map()),
          players: Array.isArray(data.players) ? new Map(data.players) : (data.players instanceof Map ? data.players : new Map()),
          planets: Array.isArray(data.planets) ? data.planets : []
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
   * Clear all stored universes and drafts
   */
  async clearAll() {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME, DRAFT_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const draftStore = transaction.objectStore(DRAFT_STORE_NAME);
      store.clear();
      draftStore.clear();

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = (e) => reject(new Error(`Fallo limpiando base de datos: ${e.target.error}`));
    });
  }
}
