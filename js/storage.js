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

    // Normalize players into entries [ [id, playerObj], ... ]
    let playersArr = [];
    if (universeData.players instanceof Map) {
      playersArr = Array.from(universeData.players.entries());
    } else if (Array.isArray(universeData.players)) {
      playersArr = universeData.players.map(item => Array.isArray(item) ? item : [item?.id || item?.playerId, item]);
    } else if (universeData.players && typeof universeData.players === 'object') {
      if (!('size' in universeData.players && Object.keys(universeData.players).length <= 2 && typeof universeData.players.size === 'number')) {
        playersArr = Object.entries(universeData.players);
      }
    }

    // Normalize alliances into entries [ [id, allianceObj], ... ]
    let alliancesArr = [];
    if (universeData.alliances instanceof Map) {
      alliancesArr = Array.from(universeData.alliances.entries());
    } else if (Array.isArray(universeData.alliances)) {
      alliancesArr = universeData.alliances.map(item => Array.isArray(item) ? item : [item?.id || item?.allianceId, item]);
    } else if (universeData.alliances && typeof universeData.alliances === 'object') {
      if (!('size' in universeData.alliances && Object.keys(universeData.alliances).length <= 2 && typeof universeData.alliances.size === 'number')) {
        alliancesArr = Object.entries(universeData.alliances);
      }
    }

    const serializable = {
      uniKey: universeData.uniKey,
      community: universeData.community,
      uniNumber: universeData.uniNumber,
      role: universeData.role || 'exodus',
      savedAt: Date.now(),
      serverData: universeData.serverData,
      alliances: alliancesArr,
      players: playersArr,
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
   * Save a batch of universes in chunks of IndexedDB transactions to prevent freezing
   */
  async saveAllUniverses(universesList, onProgress = () => {}) {
    await this.initPromise;
    const list = Array.isArray(universesList) ? universesList : Array.from(universesList.values());
    if (!list || list.length === 0) return true;

    const total = list.length;
    const BATCH_SIZE = 4;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const chunk = list.slice(i, i + BATCH_SIZE);

      await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = (e) => reject(new Error(`Fallo guardando lote en IndexedDB: ${e.target.error}`));
        transaction.onabort = (e) => reject(new Error(`Transacción abortada: ${e.target.error}`));

        for (const universeData of chunk) {
          if (!universeData || !universeData.uniKey) continue;

          let playersArr = [];
          if (universeData.players instanceof Map) {
            playersArr = Array.from(universeData.players.entries());
          } else if (Array.isArray(universeData.players)) {
            playersArr = universeData.players.map(item => Array.isArray(item) ? item : [item?.id || item?.playerId, item]);
          } else if (universeData.players && typeof universeData.players === 'object') {
            if (!('size' in universeData.players && Object.keys(universeData.players).length <= 2 && typeof universeData.players.size === 'number')) {
              playersArr = Object.entries(universeData.players);
            }
          }

          let alliancesArr = [];
          if (universeData.alliances instanceof Map) {
            alliancesArr = Array.from(universeData.alliances.entries());
          } else if (Array.isArray(universeData.alliances)) {
            alliancesArr = universeData.alliances.map(item => Array.isArray(item) ? item : [item?.id || item?.allianceId, item]);
          } else if (universeData.alliances && typeof universeData.alliances === 'object') {
            if (!('size' in universeData.alliances && Object.keys(universeData.alliances).length <= 2 && typeof universeData.alliances.size === 'number')) {
              alliancesArr = Object.entries(universeData.alliances);
            }
          }

          const serializable = {
            uniKey: universeData.uniKey,
            community: universeData.community || universeData.uniKey.split('_')[0] || 'es',
            uniNumber: universeData.uniNumber || Number(universeData.uniKey.split('_')[1]) || 1,
            role: universeData.role || 'exodus',
            savedAt: Date.now(),
            serverData: universeData.serverData,
            alliances: alliancesArr,
            players: playersArr,
            planets: Array.isArray(universeData.planets) ? universeData.planets : []
          };

          store.put(serializable);
        }
      });

      const processed = Math.min(i + BATCH_SIZE, total);
      if (typeof onProgress === 'function') {
        await onProgress({
          processed,
          total,
          percent: Math.round((processed / total) * 100),
          batch: Math.ceil((i + 1) / BATCH_SIZE),
          totalBatches: Math.ceil(total / BATCH_SIZE),
          lastUniKey: chunk[chunk.length - 1]?.uniKey
        });
      }
      await new Promise(r => setTimeout(r, 0));
    }

    return true;
  }

  static hydrateEntityMap(raw) {
    const map = new Map();
    if (!raw) return map;
    if (raw instanceof Map) return raw;

    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (!item) continue;
        if (Array.isArray(item) && item.length >= 2) {
          map.set(item[0], item[1]);
        } else if (typeof item === 'object') {
          const id = item.id || item.playerId || item.allianceId;
          if (id) map.set(id, item);
        }
      }
      return map;
    }

    if (typeof raw === 'object') {
      if ('size' in raw && Object.keys(raw).length <= 2 && typeof raw.size === 'number') {
        return map;
      }
      for (const [k, v] of Object.entries(raw)) {
        if (v && typeof v === 'object') {
          const id = v.id || v.playerId || v.allianceId || k;
          map.set(id, v);
        }
      }
    }
    return map;
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
        try {
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
            alliances: UniverseStorage.hydrateEntityMap(data.alliances),
            players: UniverseStorage.hydrateEntityMap(data.players),
            planets: Array.isArray(data.planets) ? data.planets : []
          };
          resolve(hydrated);
        } catch (err) {
          reject(err);
        }
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
        try {
          const list = req.result || [];
          const hydratedList = list.map(data => ({
            uniKey: data.uniKey,
            community: data.community,
            uniNumber: data.uniNumber,
            role: data.role || 'exodus',
            savedAt: data.savedAt,
            serverData: data.serverData,
            alliances: UniverseStorage.hydrateEntityMap(data.alliances),
            players: UniverseStorage.hydrateEntityMap(data.players),
            planets: Array.isArray(data.planets) ? data.planets : []
          }));
          resolve(hydratedList);
        } catch (err) {
          reject(err);
        }
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

export const LocalStorageService = UniverseStorage;
