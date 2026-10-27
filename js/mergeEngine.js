/**
 * OGame Universe Merge Engine
 * Handles client-side simulation of universe fusion:
 * - Entity deduplication (players, alliances)
 * - Galactic coordinate collision detection and closest-slot relocation (Host Destination priority)
 * - Traffic light color scaling based on origin universe military / fleet war speed:
 *     * Verde: Universo x1
 *     * Amarillo: Universos x2 a x4 (y x5)
 *     * Rojo: Universos x6 en adelante
 * - Unified highscore recalculation across all 8 official highscore types
 * - Global density and analytical matrix calculation
 */

export class UniverseMergeEngine {
  constructor(universes = []) {
    this.universes = universes;
    this.maxGalaxies = 9;
    this.maxSystems = 499;
    this.slotsPerSystem = 15;
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

  executeMerge() {
    if (!this.universes || this.universes.length < 2) {
      throw new Error('Se requieren al menos 2 universos para ejecutar una fusión.');
    }

    // Determine target universe geometry
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

    // Aggregate entities
    for (const u of this.universes) {
      const warSpeed = u.serverData?.speedFleetWar || u.serverData?.speedFleet || u.serverData?.speed || 1;
      const speedLight = UniverseMergeEngine.getSpeedTrafficLight(warSpeed);

      for (const [id, player] of u.players.entries()) {
        mergedPlayers.set(player.id, {
          ...player,
          role: u.role || 'exodus',
          speedFleetWar: warSpeed,
          speedTrafficLight: speedLight,
          mergedRanks: {},
          deltaRanks: {},
          collisionName: false,
          displayName: player.name
        });
      }

      for (const [id, alliance] of u.alliances.entries()) {
        mergedAlliances.set(alliance.id, {
          ...alliance,
          role: u.role || 'exodus',
          speedFleetWar: warSpeed,
          speedTrafficLight: speedLight,
          collisionTag: false,
          displayTag: alliance.tag
        });
      }

      for (const planet of u.planets) {
        rawPlanets.push({
          ...planet,
          role: u.role || 'exodus',
          speedFleetWar: warSpeed,
          speedTrafficLight: speedLight,
          hasCollision: false,
          retained: false,
          relocated: false,
          originalCoords: planet.coords.raw,
          targetCoords: planet.coords.raw
        });
      }
    }

    // 1. Resolve Nickname Collisions
    const nickCollisions = this.resolveNameCollisions(mergedPlayers);

    // 2. Resolve Alliance Tag Collisions
    const tagCollisions = this.resolveAllianceTagCollisions(mergedAlliances);

    // 3. Resolve Coordinate Collisions & Relocation
    const { planets, coordinateCollisions, occupiedSlots } = this.resolveCoordinateCollisions(rawPlanets, mergedPlayers);

    // 4. Recalculate Highscores & Delta Ranks (All 8 types)
    const highscores = this.recalculateHighscores(mergedPlayers);

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
      analytics
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

  resolveCoordinateCollisions(rawPlanets, playersMap) {
    const coordMap = new Map();
    const coordinateCollisions = [];
    const occupiedSlots = new Set();

    for (const pl of rawPlanets) {
      const coordKey = `${pl.coords.g}:${pl.coords.s}:${pl.coords.p}`;
      if (!coordMap.has(coordKey)) {
        coordMap.set(coordKey, []);
      }
      coordMap.get(coordKey).push(pl);
    }

    const finalPlanets = [];

    for (const [coordKey, list] of coordMap.entries()) {
      if (list.length === 1) {
        const planet = list[0];
        planet.retained = true;
        occupiedSlots.add(coordKey);
        finalPlanets.push(planet);
      } else {
        list.sort((a, b) => {
          const isDestA = a.role === 'destination';
          const isDestB = b.role === 'destination';
          if (isDestA && !isDestB) return -1;
          if (isDestB && !isDestA) return 1;

          const scoreA = playersMap.get(a.playerId)?.scores.total || 0;
          const scoreB = playersMap.get(b.playerId)?.scores.total || 0;
          return scoreB - scoreA;
        });

        const winner = list[0];
        winner.retained = true;
        winner.hasCollision = true;
        occupiedSlots.add(coordKey);
        finalPlanets.push(winner);
      }
    }

    for (const [coordKey, list] of coordMap.entries()) {
      if (list.length > 1) {
        const winner = list[0];
        const winnerPlayer = playersMap.get(winner.playerId);

        for (let i = 1; i < list.length; i++) {
          const displaced = list[i];
          const displacedPlayer = playersMap.get(displaced.playerId);
          displaced.hasCollision = true;
          displaced.relocated = true;

          const newCoords = this.findNearestVacantSlot(
            displaced.coords.g,
            displaced.coords.s,
            displaced.coords.p,
            occupiedSlots
          );

          occupiedSlots.add(newCoords.raw);
          displaced.coords = newCoords;
          displaced.targetCoords = newCoords.raw;

          finalPlanets.push(displaced);

          coordinateCollisions.push({
            originalCoords: coordKey,
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
              score: displacedPlayer?.scores.total || 0
            },
            retainedPlayer: {
              id: winner.playerId,
              name: winnerPlayer?.displayName || winnerPlayer?.name || 'Desconocido',
              uniKey: winner.uniKey,
              role: winner.role,
              speedFleetWar: winner.speedFleetWar,
              speedTrafficLight: winner.speedTrafficLight,
              score: winnerPlayer?.scores.total || 0
            }
          });
        }
      }
    }

    return {
      planets: finalPlanets,
      coordinateCollisions,
      occupiedSlots
    };
  }

  findNearestVacantSlot(startG, startS, startP, occupiedSlots) {
    for (let sDist = 0; sDist < this.maxSystems; sDist++) {
      const candidateSystems = sDist === 0 ? [startS] : [startS + sDist, startS - sDist];

      for (const sys of candidateSystems) {
        if (sys >= 1 && sys <= this.maxSystems) {
          const candidateSlots = this.getRadialSlots(startP, this.slotsPerSystem);
          for (const pos of candidateSlots) {
            const testKey = `${startG}:${sys}:${pos}`;
            if (!occupiedSlots.has(testKey)) {
              return { g: startG, s: sys, p: pos, raw: testKey };
            }
          }
        }
      }
    }

    for (let gDist = 1; gDist < this.maxGalaxies; gDist++) {
      const candidateGalaxies = [startG + gDist, startG - gDist];

      for (const gal of candidateGalaxies) {
        if (gal >= 1 && gal <= this.maxGalaxies) {
          for (let sys = 1; sys <= this.maxSystems; sys++) {
            for (let pos = 1; pos <= this.slotsPerSystem; pos++) {
              const testKey = `${gal}:${sys}:${pos}`;
              if (!occupiedSlots.has(testKey)) {
                return { g: gal, s: sys, p: pos, raw: testKey };
              }
            }
          }
        }
      }
    }

    throw new Error('El universo de destino ha alcanzado su capacidad máxima absoluta.');
  }

  getRadialSlots(centerSlot, maxSlot = 15) {
    const slots = [centerSlot];
    for (let dist = 1; dist < maxSlot; dist++) {
      const down = centerSlot - dist;
      const up = centerSlot + dist;
      if (down >= 1) slots.push(down);
      if (up <= maxSlot) slots.push(up);
    }
    return slots;
  }

  recalculateHighscores(playersMap) {
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

    for (const cat of categories) {
      const sorted = [...playerArray].sort((a, b) => {
        const diff = (b.scores[cat] || 0) - (a.scores[cat] || 0);
        if (diff !== 0) return diff;
        return a.displayName.localeCompare(b.displayName);
      });

      const rankedList = [];

      for (let i = 0; i < sorted.length; i++) {
        const player = sorted[i];
        const newRank = i + 1;
        const oldRank = player.ranks[cat] || 0;
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
      totalPoints += p.scores.total || 0;
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
