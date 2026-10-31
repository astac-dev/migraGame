/**
 * OGame Universe Merge Engine
 * Handles client-side simulation of universe fusion:
 * - Entity deduplication (players, alliances)
 * - Galactic coordinate collision detection and closest-slot relocation (Host Destination priority)
 * - Ultra-fast integer bitmask spatial lookup (eliminating event loop freezing)
 * - Dynamic galaxy expansion (infinite capacity without hard limits or throwing errors)
 * - Asynchronous chunked execution with granular real-time progress callbacks
 * - Traffic light color scaling based on origin universe military / fleet war speed:
 *     * Verde: Universo x1
 *     * Amarillo: Universos x2 a x4 (y x5)
 *     * Rojo: Universos x6 en adelante
 * - Unified highscore recalculation across all 8 official highscore types
 * - Global density and analytical matrix calculation
 */

export class UniverseMergeEngine {
  // Precomputed radial distance slot spiral table for positions 1..16
  static RADIAL_SLOTS_TABLE = (() => {
    const table = [];
    for (let p = 0; p <= 16; p++) {
      const slots = [p];
      for (let dist = 1; dist <= 16; dist++) {
        const down = p - dist;
        const up = p + dist;
        if (down >= 1) slots.push(down);
        if (up <= 15) slots.push(up);
      }
      table[p] = slots;
    }
    return table;
  })();

  constructor(universes = []) {
    this.universes = universes;
    this.maxGalaxies = 9;
    this.maxSystems = 499;
    this.slotsPerSystem = 15;
    // Fast bitmask occupancy table: (galaxy << 9) + system => bits 1..15 represent slot occupancy
    // Supports up to 256 galaxies and 512 systems seamlessly with 0.5 MB typed memory
    this.systemOccupancyMask = new Uint32Array(256 * 512);
  }

  /**
   * Semáforo de velocidad militar o de guerra:
   * - Verde: x1
   * - Amarillo: x2 a x4 (y x5)
   * - Rojo: x6 en adelante
   */
  static getSpeedTrafficLight(speedFleetWar) {
    const speed = Number(speedFleetWar) || 1;
    if (speed <= 1) {
      return {
        category: 'green',
        speed,
        label: `x${speed}`,
        badgeClass: 'badge-speed-green',
        color: '#00ff88',
        text: 'x1 (Verde)',
        desc: 'Velocidad Militar x1 (Estándar)'
      };
    } else if (speed <= 5) {
      return {
        category: 'yellow',
        speed,
        label: `x${speed}`,
        badgeClass: 'badge-speed-yellow',
        color: '#fbbf24',
        text: 'x2-x4 (Amarillo)',
        desc: 'Velocidad Militar x2 a x4 (Media)'
      };
    } else {
      return {
        category: 'red',
        speed,
        label: `x${speed}`,
        badgeClass: 'badge-speed-red',
        color: '#ff3366',
        text: 'x6+ (Rojo)',
        desc: 'Velocidad Militar x6+ (Rápida)'
      };
    }
  }

  /**
   * Main fusion execution method (Asynchronous with chunking)
   */
  async executeMerge(onProgress = () => {}) {
    if (!this.universes || this.universes.length < 2) {
      throw new Error('Se requieren al menos 2 universos para ejecutar una fusión.');
    }

    // Determine initial target universe geometry
    for (const u of this.universes) {
      if (u.serverData?.galaxies && u.serverData.galaxies > this.maxGalaxies) {
        this.maxGalaxies = u.serverData.galaxies;
      }
      if (u.serverData?.systems && u.serverData.systems > this.maxSystems) {
        this.maxSystems = u.serverData.systems;
      }
    }

    const mergedPlayers = new Map();
    const mergedAlliances = new Map();
    const rawPlanets = [];

    // Aggregate entities safely normalized
    for (const u of this.universes) {
      if (!u) continue;
      const warSpeed = u.serverData?.speedFleetWar || u.serverData?.speedFleet || u.serverData?.speed || 1;
      const speedLight = UniverseMergeEngine.getSpeedTrafficLight(warSpeed);

      // Safe normalization of players (Map, Array, or Object)
      let playersEntries = [];
      if (u.players && typeof u.players.entries === 'function') {
        try {
          playersEntries = Array.from(u.players.entries());
        } catch (e) {
          playersEntries = [];
        }
      } else if (Array.isArray(u.players)) {
        playersEntries = u.players.map(item => Array.isArray(item) ? item : [item?.id || item?.playerId, item]);
      } else if (u.players && typeof u.players === 'object') {
        if (!('size' in u.players && Object.keys(u.players).length <= 2 && typeof u.players.size === 'number')) {
          playersEntries = Object.entries(u.players);
        }
      }

      for (const [id, player] of playersEntries) {
        if (!player || typeof player !== 'object') continue;
        const pId = player.id || id;
        mergedPlayers.set(pId, {
          ...player,
          id: pId,
          role: u.role || 'exodus',
          speedFleetWar: warSpeed,
          speedTrafficLight: speedLight,
          scores: player.scores || { total: player.score || 0, economy: 0, research: 0, military: 0, militaryLost: 0, militaryBuilt: 0, militaryDestroyed: 0, honor: 0 },
          ranks: player.ranks || { total: player.rank || 0, economy: 0, research: 0, military: 0, militaryLost: 0, militaryBuilt: 0, militaryDestroyed: 0, honor: 0 },
          mergedRanks: player.mergedRanks || {},
          deltaRanks: player.deltaRanks || {},
          collisionName: false,
          displayName: player.name || player.displayName || `Jugador ${pId}`
        });
      }

      // Safe normalization of alliances (Map, Array, or Object)
      let alliancesEntries = [];
      if (u.alliances && typeof u.alliances.entries === 'function') {
        try {
          alliancesEntries = Array.from(u.alliances.entries());
        } catch (e) {
          alliancesEntries = [];
        }
      } else if (Array.isArray(u.alliances)) {
        alliancesEntries = u.alliances.map(item => Array.isArray(item) ? item : [item?.id || item?.allianceId, item]);
      } else if (u.alliances && typeof u.alliances === 'object') {
        if (!('size' in u.alliances && Object.keys(u.alliances).length <= 2 && typeof u.alliances.size === 'number')) {
          alliancesEntries = Object.entries(u.alliances);
        }
      }

      for (const [id, alliance] of alliancesEntries) {
        if (!alliance || typeof alliance !== 'object') continue;
        const aId = alliance.id || id;
        mergedAlliances.set(aId, {
          ...alliance,
          id: aId,
          role: u.role || 'exodus',
          speedFleetWar: warSpeed,
          speedTrafficLight: speedLight,
          collisionTag: false,
          displayTag: alliance.tag || 'TAG'
        });
      }

      // Safe normalization of planets (Array or iterable)
      const planetsList = Array.isArray(u.planets) ? u.planets : [];
      for (const planet of planetsList) {
        if (!planet || typeof planet !== 'object') continue;
        const rawCoords = planet.originalCoords || planet.coords?.raw || (typeof planet.coords === 'string' ? planet.coords : `${planet.coords?.g || 1}:${planet.coords?.s || 1}:${planet.coords?.p || 1}`);
        const parts = (rawCoords || '1:1:1').split(':').map(Number);
        const cleanCoords = {
          g: parts[0] || (planet.coords?.g ?? 1),
          s: parts[1] || (planet.coords?.s ?? 1),
          p: parts[2] || (planet.coords?.p ?? 1),
          raw: rawCoords || '1:1:1'
        };
        rawPlanets.push({
          ...planet,
          role: u.role || 'exodus',
          speedFleetWar: warSpeed,
          speedTrafficLight: speedLight,
          coords: cleanCoords,
          hasCollision: false,
          retained: false,
          relocated: false,
          originalCoords: rawCoords || '1:1:1',
          targetCoords: rawCoords || '1:1:1'
        });
      }
    }

    // 1. Resolve Nickname Collisions
    const nickCollisions = this.resolveNameCollisions(mergedPlayers);

    // 2. Resolve Alliance Tag Collisions
    const tagCollisions = this.resolveAllianceTagCollisions(mergedAlliances);

    // 3. Resolve Coordinate Collisions & Relocation (Chunked & Asynchronous)
    const {
      planets,
      coordinateCollisions,
      occupiedSlots,
      planetsByOriginalCoord,
      planetsByCurrentCoord
    } = await this.resolveCoordinateCollisions(rawPlanets, mergedPlayers, onProgress);

    // 4. Recalculate Highscores & Delta Ranks (All 8 types, Chunked)
    const highscores = await this.recalculateHighscores(mergedPlayers, onProgress);

    // 5. Calculate Density and Analytics Matrix
    const analytics = this.calculateAnalytics(
      mergedPlayers,
      planets,
      coordinateCollisions,
      nickCollisions,
      tagCollisions,
      occupiedSlots
    );

    return {
      destination: {
        name: `Uni Fusionado (${this.universes.map(u => `${u.role === 'destination' ? '★ Destino:' : 'Éxodo:'} U${u.uniNumber}`).join(' | ')})`,
        galaxies: this.maxGalaxies,
        systems: this.maxSystems,
        slotsPerSystem: this.slotsPerSystem
      },
      players: mergedPlayers,
      alliances: mergedAlliances,
      planets,
      highscores,
      conflicts: {
        coordinates: coordinateCollisions,
        nicknames: nickCollisions,
        tags: tagCollisions
      },
      analytics,
      planetsByOriginalCoord,
      planetsByCurrentCoord
    };
  }

  resolveNameCollisions(playersMap) {
    const nameMap = new Map();
    const collisions = [];

    for (const player of playersMap.values()) {
      const lower = player.name.toLowerCase();
      if (!nameMap.has(lower)) {
        nameMap.set(lower, []);
      }
      nameMap.get(lower).push(player);
    }

    for (const [name, list] of nameMap.entries()) {
      if (list.length > 1) {
        list.sort((a, b) => {
          if (a.role === 'destination' && b.role !== 'destination') return -1;
          if (b.role === 'destination' && a.role !== 'destination') return 1;
          return b.scores.total - a.scores.total;
        });

        const keeper = list[0];

        for (let i = 1; i < list.length; i++) {
          const loser = list[i];
          loser.collisionName = true;
          loser.displayName = `${loser.name}_U${loser.uniKey.split('_')[1] || loser.uniKey}`;
          collisions.push({
            originalName: loser.name,
            assignedName: loser.displayName,
            playerId: loser.id,
            uniKey: loser.uniKey,
            keeperId: keeper.id,
            keeperUniKey: keeper.uniKey
          });
        }
      }
    }

    return collisions;
  }

  resolveAllianceTagCollisions(alliancesMap) {
    const tagMap = new Map();
    const collisions = [];

    for (const alliance of alliancesMap.values()) {
      const lower = alliance.tag.toLowerCase();
      if (!tagMap.has(lower)) {
        tagMap.set(lower, []);
      }
      tagMap.get(lower).push(alliance);
    }

    for (const [tag, list] of tagMap.entries()) {
      if (list.length > 1) {
        list.sort((a, b) => {
          if (a.role === 'destination' && b.role !== 'destination') return -1;
          if (b.role === 'destination' && a.role !== 'destination') return 1;
          return a.name.localeCompare(b.name);
        });

        const keeper = list[0];

        for (let i = 1; i < list.length; i++) {
          const loser = list[i];
          loser.collisionTag = true;
          loser.displayTag = `${loser.tag}_U${loser.uniKey.split('_')[1] || loser.uniKey}`;
          collisions.push({
            originalTag: loser.tag,
            assignedTag: loser.displayTag,
            allianceId: loser.id,
            uniKey: loser.uniKey,
            keeperId: keeper.id
          });
        }
      }
    }

    return collisions;
  }

  /**
   * Fast coordinate collision resolution with chunking and bitmask lookup
   */
  async resolveCoordinateCollisions(rawPlanets, playersMap, onProgress = () => {}) {
    const coordMap = new Map();
    const coordinateCollisions = [];
    const occupiedSlots = new Set();

    // Group all planets by requested coordinate key
    for (const pl of rawPlanets) {
      const coordKey = `${pl.coords.g}:${pl.coords.s}:${pl.coords.p}`;
      if (!coordMap.has(coordKey)) {
        coordMap.set(coordKey, []);
      }
      coordMap.get(coordKey).push(pl);
    }

    const finalPlanets = [];
    const displacedQueue = [];

    // Pass 1: Identify retaining winners and register them into occupancy bitmasks
    for (const [coordKey, list] of coordMap.entries()) {
      if (list.length === 1) {
        const planet = list[0];
        planet.retained = true;
        occupiedSlots.add(coordKey);
        this.markSlotOccupied(planet.coords.g, planet.coords.s, planet.coords.p);
        finalPlanets.push(planet);
      } else {
        // Sort contestants: Host (destination) server priority first, then total score descending
        list.sort((a, b) => {
          const isDestA = a.role === 'destination';
          const isDestB = b.role === 'destination';
          if (isDestA && !isDestB) return -1;
          if (isDestB && !isDestA) return 1;

          const scoreA = playersMap.get(a.playerId)?.scores?.total || 0;
          const scoreB = playersMap.get(b.playerId)?.scores?.total || 0;
          return scoreB - scoreA;
        });

        const winner = list[0];
        winner.retained = true;
        winner.hasCollision = true;
        occupiedSlots.add(coordKey);
        this.markSlotOccupied(winner.coords.g, winner.coords.s, winner.coords.p);
        finalPlanets.push(winner);

        // Queue remaining displaced planets for chunked relocation
        const winnerPlayer = playersMap.get(winner.playerId);
        for (let i = 1; i < list.length; i++) {
          displacedQueue.push({
            displaced: list[i],
            winner,
            winnerPlayer,
            coordKey
          });
        }
      }
    }

    // Pass 2: Relocate displaced planets in chunks of 500 to keep UI responsive
    const totalDisplaced = displacedQueue.length;
    const CHUNK_SIZE = 500;

    for (let i = 0; i < totalDisplaced; i++) {
      const item = displacedQueue[i];
      const displaced = item.displaced;
      const displacedPlayer = playersMap.get(displaced.playerId);
      displaced.hasCollision = true;
      displaced.relocated = true;

      // Ultra-fast bitmask lookup with infinite capacity dynamic expansion
      const newCoords = this.findNearestVacantSlot(
        displaced.coords.g,
        displaced.coords.s,
        displaced.coords.p,
        occupiedSlots
      );

      displaced.coords = newCoords;
      displaced.targetCoords = newCoords.raw;
      finalPlanets.push(displaced);

      coordinateCollisions.push({
        originalCoords: item.coordKey,
        newCoords: newCoords.raw,
        planetId: displaced.id,
        planetName: displaced.name,
        displacedPlayer: {
          id: displaced.playerId,
          name: displacedPlayer?.displayName || displacedPlayer?.name || 'Desconocido',
          uniKey: displaced.uniKey,
          role: displaced.role,
          speedFleetWar: displaced.speedFleetWar,
          speedTrafficLight: displaced.speedTrafficLight,
          score: displacedPlayer?.scores?.total || 0
        },
        retainedPlayer: {
          id: item.winner.playerId,
          name: item.winnerPlayer?.displayName || item.winnerPlayer?.name || 'Desconocido',
          uniKey: item.winner.uniKey,
          role: item.winner.role,
          speedFleetWar: item.winner.speedFleetWar,
          speedTrafficLight: item.winner.speedTrafficLight,
          score: item.winnerPlayer?.scores?.total || 0
        }
      });

      // Yield to UI thread every chunk
      if ((i + 1) % CHUNK_SIZE === 0 || (i + 1) === totalDisplaced) {
        if (typeof onProgress === 'function') {
          await onProgress({
            phase: 'Colisiones',
            current: i + 1,
            total: totalDisplaced,
            chunk: Math.ceil((i + 1) / CHUNK_SIZE),
            totalChunks: Math.ceil(totalDisplaced / CHUNK_SIZE),
            percent: Math.round(((i + 1) / totalDisplaced) * 100)
          });
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Pass 3: Precompute O(1) fast lookup index maps for galaxy rendering
    const planetsByOriginalCoord = new Map();
    const planetsByCurrentCoord = new Map();
    for (const pl of finalPlanets) {
      const origKey = pl.originalCoords || pl.coords?.raw || '1:1:1';
      if (!planetsByOriginalCoord.has(origKey)) {
        planetsByOriginalCoord.set(origKey, []);
      }
      planetsByOriginalCoord.get(origKey).push(pl);

      const currKey = pl.targetCoords || pl.coords?.raw || origKey;
      if (!planetsByCurrentCoord.has(currKey)) {
        planetsByCurrentCoord.set(currKey, []);
      }
      planetsByCurrentCoord.get(currKey).push(pl);
    }

    return {
      planets: finalPlanets,
      coordinateCollisions,
      occupiedSlots,
      planetsByOriginalCoord,
      planetsByCurrentCoord
    };
  }

  /**
   * Helper to mark a slot occupied in the fast bitmask table
   */
  markSlotOccupied(g, s, p) {
    if (g >= 1 && g < 256 && s >= 1 && s <= 512 && p >= 1 && p <= 25) {
      this.systemOccupancyMask[(g << 9) + s] |= (1 << p);
    }
  }

  /**
   * Ultra-fast vacant slot finder:
   * 1. Spiral search across nearby systems in the same galaxy using precomputed radial slot tables
   * 2. Search adjacent galaxies
   * 3. Dynamic expansion beyond initial boundaries when capacity is reached (NEVER throws an error)
   */
  findNearestVacantSlot(startG, startS, startP, occupiedSlots) {
    const fullMask = (1 << (this.slotsPerSystem + 1)) - 2;
    const radialSlots = UniverseMergeEngine.RADIAL_SLOTS_TABLE[startP] || UniverseMergeEngine.RADIAL_SLOTS_TABLE[1];

    // 1. Same galaxy outward spiral
    for (let sDist = 0; sDist < this.maxSystems; sDist++) {
      const candidateSystems = sDist === 0 ? [startS] : [startS + sDist, startS - sDist];

      for (let k = 0; k < candidateSystems.length; k++) {
        const sys = candidateSystems[k];
        if (sys >= 1 && sys <= this.maxSystems) {
          const idx = (startG << 9) + sys;
          const mask = this.systemOccupancyMask[idx];
          if ((mask & fullMask) === fullMask) continue; // Entire system is occupied

          for (let j = 0; j < radialSlots.length; j++) {
            const pos = radialSlots[j];
            if ((mask & (1 << pos)) === 0) {
              this.systemOccupancyMask[idx] |= (1 << pos);
              const testKey = `${startG}:${sys}:${pos}`;
              occupiedSlots.add(testKey);
              return { g: startG, s: sys, p: pos, raw: testKey };
            }
          }
        }
      }
    }

    // 2. Adjacent galaxies within current maxGalaxies
    for (let gDist = 1; gDist < this.maxGalaxies; gDist++) {
      const candidateGalaxies = [startG + gDist, startG - gDist];

      for (let k = 0; k < candidateGalaxies.length; k++) {
        const gal = candidateGalaxies[k];
        if (gal >= 1 && gal <= this.maxGalaxies) {
          for (let sys = 1; sys <= this.maxSystems; sys++) {
            const idx = (gal << 9) + sys;
            const mask = this.systemOccupancyMask[idx];
            if ((mask & fullMask) === fullMask) continue;

            for (let pos = 1; pos <= this.slotsPerSystem; pos++) {
              if ((mask & (1 << pos)) === 0) {
                this.systemOccupancyMask[idx] |= (1 << pos);
                const testKey = `${gal}:${sys}:${pos}`;
                occupiedSlots.add(testKey);
                return { g: gal, s: sys, p: pos, raw: testKey };
              }
            }
          }
        }
      }
    }

    // 3. Dynamic Expansion (NO CAPACITY LIMIT - NEVER THROW)
    // Seamlessly expands galaxies to fit any universe size or multi-server volume
    let overflowG = this.maxGalaxies;
    while (true) {
      overflowG++;
      if (overflowG > this.maxGalaxies) {
        this.maxGalaxies = overflowG;
      }
      for (let sys = 1; sys <= this.maxSystems; sys++) {
        const idx = (overflowG << 9) + sys;
        const mask = this.systemOccupancyMask[idx];
        if ((mask & fullMask) === fullMask) continue;

        for (let pos = 1; pos <= this.slotsPerSystem; pos++) {
          if ((mask & (1 << pos)) === 0) {
            this.systemOccupancyMask[idx] |= (1 << pos);
            const testKey = `${overflowG}:${sys}:${pos}`;
            occupiedSlots.add(testKey);
            return { g: overflowG, s: sys, p: pos, raw: testKey };
          }
        }
      }
    }
  }

  getRadialSlots(centerSlot, maxSlot = 15) {
    return UniverseMergeEngine.RADIAL_SLOTS_TABLE[centerSlot] || [centerSlot];
  }

  /**
   * Recalculates highscores across all 8 official categories with chunked event loop yielding
   */
  async recalculateHighscores(playersMap, onProgress = () => {}) {
    const categories = [
      'total',
      'economy',
      'research',
      'military',
      'militaryLost',
      'militaryBuilt',
      'militaryDestroyed',
      'honor'
    ];
    const highscoreResults = {};
    const playerArray = Array.from(playersMap.values());

    for (let cIdx = 0; cIdx < categories.length; cIdx++) {
      const cat = categories[cIdx];
      const sorted = [...playerArray].sort((a, b) => {
        const bScore = (b.scores && b.scores[cat]) || 0;
        const aScore = (a.scores && a.scores[cat]) || 0;
        const diff = bScore - aScore;
        if (diff !== 0) return diff;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });

      const rankedList = [];

      for (let i = 0; i < sorted.length; i++) {
        const player = sorted[i];
        const newRank = i + 1;
        const oldRank = (player.ranks && player.ranks[cat]) || 0;
        const delta = oldRank > 0 ? (oldRank - newRank) : 0;

        player.mergedRanks[cat] = newRank;
        player.deltaRanks[cat] = delta;

        rankedList.push({
          rank: newRank,
          oldRank,
          delta,
          playerId: player.id,
          name: player.displayName,
          originalName: player.name,
          collisionName: player.collisionName,
          allianceId: player.allianceId,
          uniKey: player.uniKey,
          role: player.role,
          speedFleetWar: player.speedFleetWar,
          speedTrafficLight: player.speedTrafficLight,
          status: player.status,
          score: player.scores[cat] || 0,
          ships: cat === 'military' ? (player.ships || 0) : undefined,
          planetsCount: player.planetsCount || 0
        });
      }

      highscoreResults[cat] = rankedList;

      if (typeof onProgress === 'function') {
        await onProgress({
          phase: 'Clasificaciones',
          category: cat,
          current: cIdx + 1,
          total: categories.length,
          percent: Math.round(((cIdx + 1) / categories.length) * 100)
        });
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return highscoreResults;
  }

  calculateAnalytics(playersMap, planets, coordCollisions, nickCollisions, tagCollisions, occupiedSlots) {
    let totalPlayers = 0;
    let activePlayers = 0;
    let vacationPlayers = 0;
    let inactivePlayers = 0;
    let totalPoints = 0;
    let totalShips = 0;

    const speedCounts = {
      green: 0,  // x1
      yellow: 0, // x2 - x4 (x5)
      red: 0     // x6+
    };

    for (const p of playersMap.values()) {
      totalPlayers++;
      totalPoints += p.scores?.total || 0;
      totalShips += p.ships || 0;

      const cat = p.speedTrafficLight?.category || 'green';
      if (speedCounts[cat] !== undefined) {
        speedCounts[cat]++;
      }

      const st = p.status || '';
      if (st.includes('v')) {
        vacationPlayers++;
      } else if (st.includes('i') || st.includes('I')) {
        inactivePlayers++;
      } else {
        activePlayers++;
      }
    }

    let totalMoons = 0;
    const systemDensity = new Map();

    for (const pl of planets) {
      if (pl.moon) totalMoons++;

      const sysKey = `${pl.coords.g}:${pl.coords.s}`;
      if (!systemDensity.has(sysKey)) {
        systemDensity.set(sysKey, {
          g: pl.coords.g,
          s: pl.coords.s,
          planets: 0,
          moons: 0,
          collisions: 0,
          relocations: 0
        });
      }
      const sd = systemDensity.get(sysKey);
      sd.planets++;
      if (pl.moon) sd.moons++;
      if (pl.hasCollision) sd.collisions++;
      if (pl.relocated) sd.relocations++;
    }

    const totalSlots = this.maxGalaxies * this.maxSystems * this.slotsPerSystem;
    const occupiedCount = occupiedSlots.size;
    const occupancyPercentage = Number(((occupiedCount / totalSlots) * 100).toFixed(2));

    return {
      totalPlayers,
      activePlayers,
      vacationPlayers,
      inactivePlayers,
      totalPoints,
      totalShips,
      speedCounts,
      totalPlanets: planets.length,
      totalMoons,
      totalCollisions: coordCollisions.length,
      totalNickCollisions: nickCollisions.length,
      totalTagCollisions: tagCollisions.length,
      totalSlots,
      occupiedSlotsCount: occupiedCount,
      occupancyPercentage,
      systemDensity
    };
  }
}
