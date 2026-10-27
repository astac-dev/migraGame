/**
 * XML Parser & In-Memory Validator
 * Non-blocking dynamic parser for OGame XML payloads.
 */

export class XmlParser {
  constructor() {
    this.domParser = new DOMParser();
  }

  /**
   * Reads a File object into a text string
   */
  static readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Error al leer archivo: ${reader.error}`));
      reader.readAsText(file);
    });
  }

  /**
   * Parse XML text and validate root node tag
   */
  validateAndParse(xmlText, expectedRootTag) {
    if (!xmlText || !xmlText.trim()) {
      throw new Error('El contenido XML suministrado está vacío.');
    }

    const xmlDoc = this.domParser.parseFromString(xmlText, 'application/xml');
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      const detail = parserError.textContent.trim().slice(0, 160);
      throw new Error(`Error de sintaxis XML: ${detail}`);
    }

    const rootTag = xmlDoc.documentElement.nodeName;
    if (rootTag.toLowerCase() !== expectedRootTag.toLowerCase()) {
      throw new Error(`Nodo raíz inesperado: se esperaba <${expectedRootTag}> pero se recibió <${rootTag}>.`);
    }

    return xmlDoc;
  }

  /**
   * Generator for async non-blocking iteration over large DOM node collections
   */
  static async *processInBatches(elements, batchSize = 600) {
    const total = elements.length;
    for (let i = 0; i < total; i += batchSize) {
      const chunk = [];
      const limit = Math.min(i + batchSize, total);
      for (let j = i; j < limit; j++) {
        chunk.push(elements[j]);
      }
      yield chunk;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  parseServerData(xmlDoc, community, uniNumber, role = 'exodus') {
    const serverNode = xmlDoc.querySelector('serverData');
    return {
      name: serverNode?.querySelector('name')?.textContent || `Uni ${uniNumber}`,
      number: uniNumber,
      community: community,
      role: role,
      speed: Number(serverNode?.querySelector('speed')?.textContent || 1),
      speedFleet: Number(serverNode?.querySelector('speedFleet')?.textContent || 1),
      galaxies: Number(serverNode?.querySelector('galaxies')?.textContent || 9),
      systems: Number(serverNode?.querySelector('systems')?.textContent || 499),
      acs: serverNode?.querySelector('acs')?.textContent === '1',
      defToTF: serverNode?.querySelector('defToTF')?.textContent === '1',
      donutGalaxy: serverNode?.querySelector('donutGalaxy')?.textContent === '1',
      donutSystem: serverNode?.querySelector('donutSystem')?.textContent === '1'
    };
  }

  parseAlliances(xmlDoc, uniKey) {
    const alliances = new Map();
    const nodes = xmlDoc.querySelectorAll('alliance');
    for (const node of nodes) {
      const id = node.getAttribute('id');
      alliances.set(id, {
        id: `${uniKey}_a_${id}`,
        originalId: id,
        uniKey,
        name: node.getAttribute('name') || 'Sin Nombre',
        tag: node.getAttribute('tag') || 'TAG',
        homepage: node.getAttribute('homepage') || '',
        logo: node.getAttribute('logo') || '',
        open: node.getAttribute('open') === '1'
      });
    }
    return alliances;
  }

  parsePlayers(xmlDoc, uniKey, role = 'exodus') {
    const players = new Map();
    const nodes = xmlDoc.querySelectorAll('player');
    for (const node of nodes) {
      const id = node.getAttribute('id');
      const allianceId = node.getAttribute('alliance');
      players.set(id, {
        id: `${uniKey}_p_${id}`,
        originalId: id,
        uniKey,
        role,
        name: node.getAttribute('name') || `Player_${id}`,
        status: node.getAttribute('status') || '',
        allianceId: allianceId ? `${uniKey}_a_${allianceId}` : null,
        scores: {
          total: 0,
          economy: 0,
          research: 0,
          military: 0,
          militaryLost: 0,
          militaryBuilt: 0,
          militaryDestroyed: 0,
          honor: 0
        },
        ranks: {
          total: 0,
          economy: 0,
          research: 0,
          military: 0,
          militaryLost: 0,
          militaryBuilt: 0,
          militaryDestroyed: 0,
          honor: 0
        },
        ships: 0,
        planetsCount: 0
      });
    }
    return players;
  }

  applyHighscore(xmlDoc, playersMap, scoreCategory = 'total') {
    const entries = xmlDoc.querySelectorAll('player');
    let count = 0;
    for (const entry of entries) {
      const pId = entry.getAttribute('id');
      const player = playersMap.get(pId);
      if (player) {
        player.scores[scoreCategory] = Number(entry.getAttribute('score') || 0);
        player.ranks[scoreCategory] = Number(entry.getAttribute('position') || 0);
        if (scoreCategory === 'military' && entry.hasAttribute('ships')) {
          player.ships = Number(entry.getAttribute('ships') || 0);
        }
        count++;
      }
    }
    return count;
  }

  async parseUniversePlanets(xmlDoc, uniKey, role = 'exodus', playersMap = new Map(), onProgress = () => {}) {
    const planets = [];
    const planetNodes = xmlDoc.querySelectorAll('planet');
    const total = planetNodes.length;
    let processed = 0;

    for await (const batch of XmlParser.processInBatches(planetNodes, 800)) {
      for (const node of batch) {
        const pId = node.getAttribute('id');
        const playerId = node.getAttribute('player');
        const coordsRaw = node.getAttribute('coords');
        const [g, s, p] = (coordsRaw || '1:1:1').split(':').map(Number);

        let moonData = null;
        const moonNode = node.querySelector('moon');
        if (moonNode) {
          moonData = {
            id: `${uniKey}_m_${moonNode.getAttribute('id')}`,
            originalId: moonNode.getAttribute('id'),
            name: moonNode.getAttribute('name') || 'Luna',
            size: Number(moonNode.getAttribute('size') || 8000)
          };
        }

        const planetObj = {
          id: `${uniKey}_pl_${pId}`,
          originalId: pId,
          uniKey,
          role,
          playerId: `${uniKey}_p_${playerId}`,
          originalPlayerId: playerId,
          name: node.getAttribute('name') || 'Colonia',
          coords: {
            g: g || 1,
            s: s || 1,
            p: p || 1,
            raw: coordsRaw || `${g}:${s}:${p}`
          },
          moon: moonData
        };

        planets.push(planetObj);

        if (playersMap.has(playerId)) {
          playersMap.get(playerId).planetsCount += 1;
        }
      }

      processed += batch.length;
      onProgress({ processed, total, percent: Math.round((processed / total) * 100) });
    }

    return planets;
  }
}
