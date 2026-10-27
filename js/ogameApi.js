/**
 * OGame XML API Client
 * Zero-Backend architecture for fetching and parsing official OGame XML endpoints.
 * Handles CORS proxies, network timeouts, and non-blocking DOM parsing.
 */

export class OgameApiClient {
  /**
   * @param {Object} options
   * @param {string} [options.proxyType='corsproxy'] - 'corsproxy' | 'allorigins' | 'codetabs' | 'custom' | 'direct'
   * @param {string} [options.customProxyTemplate=''] - E.g. 'https://myproxy.com/?url='
   */
  constructor(options = {}) {
    this.proxyType = options.proxyType || 'corsproxy';
    this.customProxyTemplate = options.customProxyTemplate || '';
    this.domParser = new DOMParser();
  }

  setProxy(proxyType, customProxyTemplate = '') {
    this.proxyType = proxyType;
    this.customProxyTemplate = customProxyTemplate;
  }

  buildProxiedUrl(targetUrl) {
    if (this.proxyType === 'direct') {
      return targetUrl;
    }
    if (this.proxyType === 'corsproxy') {
      return `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    }
    if (this.proxyType === 'allorigins') {
      return `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    }
    if (this.proxyType === 'codetabs') {
      return `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
    }
    if (this.proxyType === 'custom' && this.customProxyTemplate) {
      if (this.customProxyTemplate.includes('{url}')) {
        return this.customProxyTemplate.replace('{url}', encodeURIComponent(targetUrl));
      }
      return `${this.customProxyTemplate}${encodeURIComponent(targetUrl)}`;
    }
    return targetUrl;
  }

  /**
   * Unified XML fetcher with timeout and technical error diagnostics
   */
  async fetchXml(url, timeoutMs = 25000) {
    const proxiedUrl = this.buildProxiedUrl(url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(proxiedUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/xml, text/xml, */*'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} (${response.statusText}) al consultar: ${url}`);
      }

      const text = await response.text();
      if (!text || !text.trim()) {
        throw new Error(`Respuesta vacía recibida desde: ${url}`);
      }

      const xmlDoc = this.domParser.parseFromString(text, 'application/xml');
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        const errorDetail = parserError.textContent.trim().slice(0, 160);
        throw new Error(`Fallo de parseo XML en ${url}: ${errorDetail}`);
      }

      return xmlDoc;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Tiempo de espera agotado (${timeoutMs / 1000}s) conectando a: ${url}. Verifica el proxy CORS.`);
      }
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error(`Error de red o bloqueo CORS al consultar: ${url}. Prueba cambiando el proxy CORS.`);
      }
      throw err;
    }
  }

  /**
   * Fetches official list of all universes in a community from universes.xml
   */
  async fetchCommunityUniverses(community = 'es') {
    const cleanComm = community.toLowerCase().trim();
    const url = `https://s1-${cleanComm}.ogame.gameforge.com/api/universes.xml`;
    const xmlDoc = await this.fetchXml(url);
    const uniNodes = xmlDoc.querySelectorAll('universe');
    const result = [];
    for (const node of uniNodes) {
      result.push({
        id: parseInt(node.getAttribute('id') || '0', 10),
        name: node.textContent.trim() || `Uni ${node.getAttribute('id')}`,
        href: node.getAttribute('href') || ''
      });
    }
    return result;
  }

  /**
   * Parse XML node collections asynchronously in batches to prevent Event Loop locking
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

  /**
   * Fetches complete data suite for an OGame Universe
   */
  async fetchUniverseData(community, uniNumber, role = 'exodus', onProgress = () => {}) {
    const cleanComm = community.toLowerCase().trim();
    const cleanUni = String(uniNumber).trim();
    const uniKey = `${cleanComm}_${cleanUni}`;
    const baseUrl = `https://s${cleanUni}-${cleanComm}.ogame.gameforge.com/api`;

    // Standard official highscore types:
    // 0: Total, 1: Economy, 2: Research, 3: Military, 4: Military Lost, 5: Military Built, 6: Military Destroyed, 7: Honor
    const endpoints = [
      { key: 'serverData', file: 'serverData.xml', label: 'Datos del Servidor' },
      { key: 'players', file: 'players.xml', label: 'Lista de Jugadores' },
      { key: 'alliances', file: 'alliances.xml', label: 'Lista de Alianzas' },
      { key: 'universe', file: 'universe.xml', label: 'Planetas y Coordenadas' },
      { key: 'highscoreTotal', file: 'highscore.xml?category=1&type=0', label: 'Highscore Total (0)' },
      { key: 'highscoreEco', file: 'highscore.xml?category=1&type=1', label: 'Highscore Economía (1)' },
      { key: 'highscoreRes', file: 'highscore.xml?category=1&type=2', label: 'Highscore Investigación (2)' },
      { key: 'highscoreMil', file: 'highscore.xml?category=1&type=3', label: 'Highscore Militar (3)' },
      { key: 'highscoreMilLost', file: 'highscore.xml?category=1&type=4', label: 'Militar Perdido (4)' },
      { key: 'highscoreMilBuilt', file: 'highscore.xml?category=1&type=5', label: 'Militar Construido (5)' },
      { key: 'highscoreMilDestroyed', file: 'highscore.xml?category=1&type=6', label: 'Militar Destruido (6)' },
      { key: 'highscoreHonor', file: 'highscore.xml?category=1&type=7', label: 'Puntos de Honor (7)' }
    ];

    const xmlResults = {};
    const totalSteps = endpoints.length;

    for (let idx = 0; idx < totalSteps; idx++) {
      const ep = endpoints[idx];
      onProgress({
        uniKey,
        stage: 'fetching',
        endpoint: ep.key,
        label: ep.label,
        current: idx + 1,
        total: totalSteps,
        percent: Math.round(((idx) / totalSteps) * 100)
      });

      const endpointUrl = `${baseUrl}/${ep.file}`;
      const xmlDoc = await this.fetchXml(endpointUrl);
      xmlResults[ep.key] = xmlDoc;
    }

    onProgress({
      uniKey,
      stage: 'parsing',
      endpoint: 'parse',
      label: 'Procesando estructuras...',
      current: totalSteps,
      total: totalSteps,
      percent: 100
    });

    const parsedUniverse = await this.parseUniverseDataset(uniKey, cleanComm, cleanUni, role, xmlResults);
    return parsedUniverse;
  }

  async parseUniverseDataset(uniKey, community, uniNumber, role, xmls) {
    // 1. Server Data
    const serverNode = xmls.serverData.querySelector('serverData');
    const speedFleetWar = Number(serverNode?.querySelector('speedFleetWar')?.textContent || 0);
    const speedFleet = Number(serverNode?.querySelector('speedFleet')?.textContent || 1);
    const speed = Number(serverNode?.querySelector('speed')?.textContent || 1);
    const effectiveFleetWar = speedFleetWar > 0 ? speedFleetWar : (speedFleet > 0 ? speedFleet : speed);

    const serverData = {
      name: serverNode?.querySelector('name')?.textContent || `Uni ${uniNumber}`,
      number: uniNumber,
      community: community,
      role: role, // 'destination' | 'exodus'
      speed,
      speedFleet,
      speedFleetWar: effectiveFleetWar,
      galaxies: Number(serverNode?.querySelector('galaxies')?.textContent || 9),
      systems: Number(serverNode?.querySelector('systems')?.textContent || 499),
      acs: serverNode?.querySelector('acs')?.textContent === '1',
      defToTF: serverNode?.querySelector('defToTF')?.textContent === '1',
      donutGalaxy: serverNode?.querySelector('donutGalaxy')?.textContent === '1',
      donutSystem: serverNode?.querySelector('donutSystem')?.textContent === '1'
    };

    // 2. Alliances
    const alliances = new Map();
    const allianceNodes = xmls.alliances.querySelectorAll('alliance');
    for (const node of allianceNodes) {
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

    // 3. Players
    const players = new Map();
    const playerNodes = xmls.players.querySelectorAll('player');
    for (const node of playerNodes) {
      const id = node.getAttribute('id');
      const allianceId = node.getAttribute('alliance');
      players.set(id, {
        id: `${uniKey}_p_${id}`,
        originalId: id,
        uniKey,
        role: role,
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

    // 4. Highscores (All 8 official types)
    const scoreConfigs = [
      { key: 'total', xml: xmls.highscoreTotal },
      { key: 'economy', xml: xmls.highscoreEco },
      { key: 'research', xml: xmls.highscoreRes },
      { key: 'military', xml: xmls.highscoreMil },
      { key: 'militaryLost', xml: xmls.highscoreMilLost },
      { key: 'militaryBuilt', xml: xmls.highscoreMilBuilt },
      { key: 'militaryDestroyed', xml: xmls.highscoreMilDestroyed },
      { key: 'honor', xml: xmls.highscoreHonor }
    ];

    for (const sc of scoreConfigs) {
      if (!sc.xml) continue;
      const entries = sc.xml.querySelectorAll('player');
      for (const entry of entries) {
        const pId = entry.getAttribute('id');
        const player = players.get(pId);
        if (player) {
          player.scores[sc.key] = Number(entry.getAttribute('score') || 0);
          player.ranks[sc.key] = Number(entry.getAttribute('position') || 0);
          if (sc.key === 'military' && entry.hasAttribute('ships')) {
            player.ships = Number(entry.getAttribute('ships') || 0);
          }
        }
      }
    }

    // 5. Universe (Planets & Moons) - Processed in non-blocking batches
    const planets = [];
    const planetNodes = xmls.universe.querySelectorAll('planet');

    for await (const batch of OgameApiClient.processInBatches(planetNodes, 800)) {
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
          role: role,
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

        const owner = players.get(playerId);
        if (owner) {
          owner.planetsCount += 1;
        }
      }
    }

    return {
      uniKey,
      community,
      uniNumber,
      role,
      serverData,
      alliances,
      players,
      planets
    };
  }
}
