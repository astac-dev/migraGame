import { OgameApiClient } from './ogameApi.js';
import { UniverseMergeEngine } from './mergeEngine.js';

const MIGRATION_GROUPS = {
  1: {
    title: 'Grupo 1 (Universos 157 al 167)',
    exodus: [
      { id: 157, name: 'Europa' },
      { id: 158, name: 'Fenrir' },
      { id: 159, name: 'Galatea' },
      { id: 160, name: 'Himalia' },
      { id: 161, name: 'Indus' },
      { id: 162, name: 'Janice' },
      { id: 163, name: 'Kalyke' },
      { id: 164, name: 'Leda' },
      { id: 165, name: 'Mensa' },
      { id: 166, name: 'Norma' },
      { id: 167, name: 'Octans' }
    ],
    destinations: [
      { id: 173, name: 'Umbra' },
      { id: 280, name: 'OGame.es Yi-SWAN' },
      { id: 281, name: 'OGame.es Zhang' },
      { id: 282, name: 'OGame.es Astrid' }
    ]
  },
  2: {
    title: 'Grupo 2 (Universos 262 al 272)',
    exodus: [
      { id: 262, name: 'Grus' },
      { id: 264, name: 'Imai' },
      { id: 265, name: 'Jishui' },
      { id: 266, name: 'Keid' },
      { id: 267, name: 'Lyra' },
      { id: 268, name: 'Mars' },
      { id: 269, name: 'Nembus' },
      { id: 270, name: 'Ophiucus' },
      { id: 271, name: 'Pluto' },
      { id: 272, name: 'Quasi-Stellar' }
    ],
    destinations: [
      { id: 280, name: 'OGame.es Yi-SWAN' },
      { id: 281, name: 'OGame.es Zhang' },
      { id: 282, name: 'OGame.es Astrid' }
    ]
  },
  3: {
    title: 'Grupo 3 (Universos 147 al 157)',
    exodus: [
      { id: 147, name: 'Uriel' },
      { id: 148, name: 'Virgo' },
      { id: 149, name: 'Wezn' },
      { id: 150, name: 'Xanthus' },
      { id: 151, name: 'Yildun' },
      { id: 152, name: 'Zibal' },
      { id: 153, name: 'Aquarius' },
      { id: 154, name: 'Bellatrix' },
      { id: 155, name: 'Cosmos' },
      { id: 156, name: 'Dorado' },
      { id: 157, name: 'Europa' }
    ],
    destinations: [
      { id: 161, name: 'Indus' },
      { id: 280, name: 'OGame.es Yi-SWAN' },
      { id: 281, name: 'OGame.es Zhang' },
      { id: 282, name: 'OGame.es Astrid' }
    ]
  }
};

class OgameMergerApp {
  constructor() {
    this.apiClient = new OgameApiClient({ proxyType: 'corsproxy' });
    this.loadedUniverses = new Map();
    this.mergedResult = null;
    this.currentGroup = 1;
    
    this.activeTab = 'tabOverview';
    this.hsState = {
      category: 'total',
      filterUni: 'all',
      query: '',
      page: 1,
      pageSize: 50
    };

    this.galaxyState = {
      galaxy: 1,
      system: 1
    };

    this.initDomReferences();
    this.bindEvents();
    this.renderMigrationGroupDetails(1);
    this.initGalaxySelectOptions();
  }

  initDomReferences() {
    this.dom = {
      // Proxy
      proxySelect: document.getElementById('proxySelect'),
      customProxyInput: document.getElementById('customProxyInput'),

      // Migration Groups
      groupTabButtons: document.querySelectorAll('.group-tab-btn'),
      groupDetailsContainer: document.getElementById('groupDetailsContainer'),

      // Universe Setup
      addUniverseForm: document.getElementById('addUniverseForm'),
      communityInput: document.getElementById('communityInput'),
      uniNumberInput: document.getElementById('uniNumberInput'),
      uniRoleSelect: document.getElementById('uniRoleSelect'),
      addUniBtn: document.getElementById('addUniBtn'),
      loadCommunityListBtn: document.getElementById('loadCommunityListBtn'),
      communityUnisDropdownContainer: document.getElementById('communityUnisDropdownContainer'),
      communityUnisSelect: document.getElementById('communityUnisSelect'),
      closeCommunityListBtn: document.getElementById('closeCommunityListBtn'),
      selectCommunityUniBtn: document.getElementById('selectCommunityUniBtn'),

      universesList: document.getElementById('universesList'),
      emptyUniPlaceholder: document.getElementById('emptyUniPlaceholder'),
      mergeStatusText: document.getElementById('mergeStatusText'),
      runMergeBtn: document.getElementById('runMergeBtn'),

      // Containers & Tabs
      resultsContainer: document.getElementById('resultsContainer'),
      tabButtons: document.querySelectorAll('.tab-btn'),
      tabContents: document.querySelectorAll('.tab-content'),
      conflictsBadge: document.getElementById('conflictsBadge'),

      // Tab 1: Stats
      statTotalPlayers: document.getElementById('statTotalPlayers'),
      statActiveSub: document.getElementById('statActiveSub'),
      statTotalPlanets: document.getElementById('statTotalPlanets'),
      statMoonsSub: document.getElementById('statMoonsSub'),
      statCollisions: document.getElementById('statCollisions'),
      statNickCollisions: document.getElementById('statNickCollisions'),
      statOccupancy: document.getElementById('statOccupancy'),
      statOccupancySlots: document.getElementById('statOccupancySlots'),
      statTotalShips: document.getElementById('statTotalShips'),

      // Tab 2: Highscores
      hsCategorySelect: document.getElementById('hsCategorySelect'),
      hsUniverseFilter: document.getElementById('hsUniverseFilter'),
      hsSearchInput: document.getElementById('hsSearchInput'),
      highscoreTableBody: document.getElementById('highscoreTableBody'),
      hsPaginationInfo: document.getElementById('hsPaginationInfo'),
      hsPrevPageBtn: document.getElementById('hsPrevPageBtn'),
      hsNextPageBtn: document.getElementById('hsNextPageBtn'),

      // Tab 3: Galaxy
      galaxySelect: document.getElementById('galaxySelect'),
      systemInput: document.getElementById('systemInput'),
      sysPrevBtn: document.getElementById('sysPrevBtn'),
      sysNextBtn: document.getElementById('sysNextBtn'),
      galaxySysSummary: document.getElementById('galaxySysSummary'),
      systemSlotsGrid: document.getElementById('systemSlotsGrid'),

      // Tab 4: Conflicts
      coordConflictsList: document.getElementById('coordConflictsList'),
      nickConflictsList: document.getElementById('nickConflictsList'),

      // Tab 5: Export
      exportJsonBtn: document.getElementById('exportJsonBtn'),
      resetSessionBtn: document.getElementById('resetSessionBtn')
    };
  }

  bindEvents() {
    // Proxy selection
    this.dom.proxySelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'custom') {
        this.dom.customProxyInput.classList.remove('hidden');
      } else {
        this.dom.customProxyInput.classList.add('hidden');
      }
      this.apiClient.setProxy(val, this.dom.customProxyInput.value.trim());
    });

    this.dom.customProxyInput.addEventListener('input', (e) => {
      this.apiClient.setProxy('custom', e.target.value.trim());
    });

    // Group Tabs
    this.dom.groupTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.groupTabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const grp = parseInt(btn.dataset.group, 10);
        this.currentGroup = grp;
        this.renderMigrationGroupDetails(grp);
      });
    });

    // Universe form
    this.dom.addUniverseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const comm = this.dom.communityInput.value.trim().toLowerCase();
      const uniNum = parseInt(this.dom.uniNumberInput.value.trim(), 10);
      const role = this.dom.uniRoleSelect.value;
      if (comm && uniNum) {
        await this.loadSingleUniverse(comm, uniNum, role);
      }
    });

    // universes.xml auto-discovery
    this.dom.loadCommunityListBtn.addEventListener('click', async () => {
      const comm = this.dom.communityInput.value.trim().toLowerCase() || 'es';
      this.dom.loadCommunityListBtn.disabled = true;
      this.dom.loadCommunityListBtn.textContent = 'Descargando universes.xml...';

      try {
        const uniList = await this.apiClient.fetchCommunityUniverses(comm);
        this.dom.communityUnisSelect.innerHTML = '';
        const frag = document.createDocumentFragment();
        for (const u of uniList) {
          const opt = document.createElement('option');
          opt.value = u.id;
          opt.textContent = `Uni #${u.id} - ${u.name}`;
          frag.appendChild(opt);
        }
        this.dom.communityUnisSelect.appendChild(frag);
        this.dom.communityUnisDropdownContainer.classList.remove('hidden');
      } catch (err) {
        alert(`Error al obtener universes.xml: ${err.message}`);
      } finally {
        this.dom.loadCommunityListBtn.disabled = false;
        this.dom.loadCommunityListBtn.innerHTML = '<span>🌐</span> Ver Universos Oficiales';
      }
    });

    this.dom.closeCommunityListBtn.addEventListener('click', () => {
      this.dom.communityUnisDropdownContainer.classList.add('hidden');
    });

    this.dom.selectCommunityUniBtn.addEventListener('click', () => {
      const selectedId = this.dom.communityUnisSelect.value;
      if (selectedId) {
        this.dom.uniNumberInput.value = selectedId;
        this.dom.communityUnisDropdownContainer.classList.add('hidden');
      }
    });

    // Run merge
    this.dom.runMergeBtn.addEventListener('click', () => {
      this.executeSimulation();
    });

    // Tabs
    this.dom.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        this.switchTab(targetTab);
      });
    });

    // Highscore controls
    this.dom.hsCategorySelect.addEventListener('change', (e) => {
      this.hsState.category = e.target.value;
      this.hsState.page = 1;
      this.renderHighscoreTable();
    });

    this.dom.hsUniverseFilter.addEventListener('change', (e) => {
      this.hsState.filterUni = e.target.value;
      this.hsState.page = 1;
      this.renderHighscoreTable();
    });

    let debounceTimer;
    this.dom.hsSearchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.hsState.query = e.target.value.trim().toLowerCase();
        this.hsState.page = 1;
        this.renderHighscoreTable();
      }, 250);
    });

    this.dom.hsPrevPageBtn.addEventListener('click', () => {
      if (this.hsState.page > 1) {
        this.hsState.page--;
        this.renderHighscoreTable();
      }
    });

    this.dom.hsNextPageBtn.addEventListener('click', () => {
      this.hsState.page++;
      this.renderHighscoreTable();
    });

    // Galaxy explorer controls
    this.dom.galaxySelect.addEventListener('change', (e) => {
      this.galaxyState.galaxy = parseInt(e.target.value, 10);
      this.renderGalaxySystem();
    });

    this.dom.systemInput.addEventListener('change', (e) => {
      let val = parseInt(e.target.value, 10);
      const maxSys = this.mergedResult?.destination?.systems || 499;
      if (isNaN(val) || val < 1) val = 1;
      if (val > maxSys) val = maxSys;
      this.galaxyState.system = val;
      this.dom.systemInput.value = val;
      this.renderGalaxySystem();
    });

    this.dom.sysPrevBtn.addEventListener('click', () => {
      const maxSys = this.mergedResult?.destination?.systems || 499;
      if (this.galaxyState.system > 1) {
        this.galaxyState.system--;
      } else {
        this.galaxyState.system = maxSys;
      }
      this.dom.systemInput.value = this.galaxyState.system;
      this.renderGalaxySystem();
    });

    this.dom.sysNextBtn.addEventListener('click', () => {
      const maxSys = this.mergedResult?.destination?.systems || 499;
      if (this.galaxyState.system < maxSys) {
        this.galaxyState.system++;
      } else {
        this.galaxyState.system = 1;
      }
      this.dom.systemInput.value = this.galaxyState.system;
      this.renderGalaxySystem();
    });

    // Export & Reset
    this.dom.exportJsonBtn.addEventListener('click', () => {
      this.exportMergedJson();
    });

    this.dom.resetSessionBtn.addEventListener('click', () => {
      if (confirm('¿Deseas reiniciar la sesión y borrar los universos cargados?')) {
        this.resetSession();
      }
    });
  }

  renderMigrationGroupDetails(groupId) {
    const group = MIGRATION_GROUPS[groupId];
    if (!group) return;

    const comm = 'es';
    const frag = document.createDocumentFragment();

    const container = document.createElement('div');
    container.style.gridColumn = '1 / -1';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = '1.3fr 1fr';
    container.style.gap = '1rem';

    // Left: Exodus
    const exodusBox = document.createElement('div');
    exodusBox.innerHTML = `
      <div style="font-weight: 700; color: var(--accent-orange); margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem;">
        <span>🚪</span> Universos de Éxodo (Servidores a Migrar):
      </div>
      <div class="quick-load-chips" id="exodusChipsContainer"></div>
    `;

    const exodusChips = exodusBox.querySelector('#exodusChipsContainer');
    for (const u of group.exodus) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-btn';
      btn.textContent = `${u.name} (${u.id})`;
      btn.title = `Cargar ${u.name} como universo de Éxodo`;
      btn.addEventListener('click', () => {
        this.loadSingleUniverse(comm, u.id, 'exodus');
      });
      exodusChips.appendChild(btn);
    }

    // Right: Destinations
    const destBox = document.createElement('div');
    destBox.innerHTML = `
      <div style="font-weight: 700; color: var(--accent-cyan); margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem;">
        <span>🎯</span> Universos Destino (Anfitriones):
      </div>
      <div class="quick-load-chips" id="destChipsContainer"></div>
    `;

    const destChips = destBox.querySelector('#destChipsContainer');
    for (const u of group.destinations) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-btn';
      btn.style.borderColor = 'rgba(0, 240, 255, 0.4)';
      btn.textContent = `★ ${u.name} (${u.id})`;
      btn.title = `Cargar ${u.name} como universo Destino`;
      btn.addEventListener('click', () => {
        this.loadSingleUniverse(comm, u.id, 'destination');
      });
      destChips.appendChild(btn);
    }

    container.appendChild(exodusBox);
    container.appendChild(destBox);

    this.dom.groupDetailsContainer.innerHTML = '';
    this.dom.groupDetailsContainer.appendChild(container);
  }

  initGalaxySelectOptions(maxGalaxies = 9) {
    const frag = document.createDocumentFragment();
    this.dom.galaxySelect.innerHTML = '';
    for (let g = 1; g <= maxGalaxies; g++) {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = `Galaxia ${g}`;
      frag.appendChild(opt);
    }
    this.dom.galaxySelect.appendChild(frag);
  }

  async loadSingleUniverse(community, uniNumber, role = 'exodus') {
    const uniKey = `${community}_${uniNumber}`;

    if (this.loadedUniverses.has(uniKey)) {
      alert(`El universo ${community.toUpperCase()} ${uniNumber} ya está en la lista.`);
      return;
    }

    if (this.dom.emptyUniPlaceholder) {
      this.dom.emptyUniPlaceholder.remove();
    }

    const cardEl = this.createUniverseCard(uniKey, community, uniNumber, role);
    this.dom.universesList.appendChild(cardEl);

    this.setControlsLoading(true);

    try {
      const universeData = await this.apiClient.fetchUniverseData(
        community,
        uniNumber,
        role,
        (progress) => {
          this.updateUniverseCardProgress(cardEl, progress);
        }
      );

      this.loadedUniverses.set(uniKey, universeData);
      this.updateUniverseCardSuccess(cardEl, universeData);
      this.updateMergeActionState();
    } catch (err) {
      this.updateUniverseCardError(cardEl, err.message);
    } finally {
      this.setControlsLoading(false);
    }
  }

  createUniverseCard(uniKey, community, uniNumber, role) {
    const card = document.createElement('div');
    card.id = `card_${uniKey}`;
    card.className = 'universe-card loading';

    const roleTag = role === 'destination' 
      ? '<span style="color: var(--accent-cyan); font-weight: 700;">[★ DESTINO]</span>'
      : '<span style="color: var(--accent-orange); font-weight: 700;">[ÉXODO]</span>';

    card.innerHTML = `
      <div class="uni-info-main" style="flex: 1;">
        <div class="uni-title">
          <span>${roleTag} Servidor ${community.toUpperCase()} #${uniNumber}</span>
          <span class="uni-status-badge badge-loading">Descargando...</span>
        </div>
        <div class="uni-stats-line" id="stats_${uniKey}">
          <span id="label_${uniKey}">Iniciando conexión con Gameforge XML...</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar" id="bar_${uniKey}"></div>
        </div>
      </div>
      <div>
        <button type="button" class="btn btn-secondary" style="padding: 0.35rem 0.6rem; font-size: 0.75rem;" data-remove="${uniKey}">
          ✖
        </button>
      </div>
    `;

    card.querySelector(`[data-remove="${uniKey}"]`).addEventListener('click', () => {
      this.loadedUniverses.delete(uniKey);
      card.remove();
      this.updateMergeActionState();
      if (this.loadedUniverses.size === 0 && this.dom.emptyUniPlaceholder) {
        this.dom.universesList.appendChild(this.dom.emptyUniPlaceholder);
      }
    });

    return card;
  }

  updateUniverseCardProgress(cardEl, progress) {
    const bar = cardEl.querySelector('.progress-bar');
    const label = cardEl.querySelector('.uni-stats-line span');
    if (bar) bar.style.width = `${progress.percent}%`;
    if (label) label.textContent = `${progress.label} (${progress.current}/${progress.total})`;
  }

  updateUniverseCardSuccess(cardEl, data) {
    cardEl.classList.remove('loading');
    cardEl.classList.add('ready');

    const badge = cardEl.querySelector('.uni-status-badge');
    if (badge) {
      badge.className = 'uni-status-badge badge-ready';
      badge.textContent = 'Listo';
    }

    const statsLine = cardEl.querySelector('.uni-stats-line');
    if (statsLine) {
      statsLine.innerHTML = `
        <span>👥 ${data.players.size.toLocaleString()} Jugadores</span>
        <span>🪐 ${data.planets.length.toLocaleString()} Planetas</span>
        <span>🛡️ ${data.alliances.size.toLocaleString()} Alianzas</span>
        <span>⚡ Vel x${data.serverData.speed}</span>
      `;
    }

    const bar = cardEl.querySelector('.progress-bar');
    if (bar) bar.style.width = '100%';
  }

  updateUniverseCardError(cardEl, errorMessage) {
    cardEl.classList.remove('loading');
    cardEl.classList.add('error');

    const badge = cardEl.querySelector('.uni-status-badge');
    if (badge) {
      badge.className = 'uni-status-badge badge-error';
      badge.textContent = 'Error';
    }

    const statsLine = cardEl.querySelector('.uni-stats-line');
    if (statsLine) {
      statsLine.innerHTML = `<span style="color: var(--accent-red); font-size: 0.75rem;">${errorMessage}</span>`;
    }
  }

  updateMergeActionState() {
    const readyCount = this.loadedUniverses.size;
    if (readyCount >= 2) {
      this.dom.runMergeBtn.disabled = false;
      this.dom.mergeStatusText.textContent = `Estado: ${readyCount} universos listos para fusionar.`;
      this.dom.mergeStatusText.style.color = 'var(--accent-green)';
    } else {
      this.dom.runMergeBtn.disabled = true;
      this.dom.mergeStatusText.textContent = `Estado: ${readyCount} universo cargado. Se requiere al menos 2 servidores.`;
      this.dom.mergeStatusText.style.color = 'var(--text-muted)';
    }
  }

  setControlsLoading(isLoading) {
    this.dom.addUniBtn.disabled = isLoading;
    this.dom.communityInput.disabled = isLoading;
    this.dom.uniNumberInput.disabled = isLoading;
  }

  executeSimulation() {
    if (this.loadedUniverses.size < 2) return;

    try {
      const universesArray = Array.from(this.loadedUniverses.values());
      const engine = new UniverseMergeEngine(universesArray);
      this.mergedResult = engine.executeMerge();

      this.populateUniverseFilterOptions();
      this.initGalaxySelectOptions(this.mergedResult.destination.galaxies);

      this.renderOverviewMetrics();
      this.renderHighscoreTable();
      this.renderGalaxySystem();
      this.renderConflictsView();

      this.dom.resultsContainer.classList.remove('hidden');
      this.switchTab('tabOverview');
    } catch (err) {
      alert(`Error en el motor de fusión: ${err.message}`);
    }
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    this.dom.tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.dom.tabContents.forEach(content => {
      if (content.id === tabId) {
        content.classList.remove('hidden');
      } else {
        content.classList.add('hidden');
      }
    });
  }

  renderOverviewMetrics() {
    const a = this.mergedResult.analytics;
    this.dom.statTotalPlayers.textContent = a.totalPlayers.toLocaleString();
    this.dom.statActiveSub.textContent = `${a.activePlayers.toLocaleString()} activos · ${a.vacationPlayers.toLocaleString()} vacac.`;

    this.dom.statTotalPlanets.textContent = a.totalPlanets.toLocaleString();
    this.dom.statMoonsSub.textContent = `${a.totalMoons.toLocaleString()} lunas orbitales`;

    this.dom.statCollisions.textContent = a.totalCollisions.toLocaleString();
    this.dom.statNickCollisions.textContent = (a.totalNickCollisions + a.totalTagCollisions).toLocaleString();

    this.dom.statOccupancy.textContent = `${a.occupancyPercentage}%`;
    this.dom.statOccupancySlots.textContent = `${a.occupiedSlotsCount.toLocaleString()} / ${a.totalSlots.toLocaleString()} slots`;

    this.dom.statTotalShips.textContent = a.totalShips.toLocaleString();

    if (a.totalCollisions > 0 || a.totalNickCollisions > 0) {
      this.dom.conflictsBadge.textContent = (a.totalCollisions + a.totalNickCollisions).toLocaleString();
      this.dom.conflictsBadge.style.display = 'inline-block';
    } else {
      this.dom.conflictsBadge.style.display = 'none';
    }
  }

  populateUniverseFilterOptions() {
    this.dom.hsUniverseFilter.innerHTML = '<option value="all">Todos los Universos</option>';
    const frag = document.createDocumentFragment();
    for (const [key, uni] of this.loadedUniverses.entries()) {
      const opt = document.createElement('option');
      opt.value = key;
      const rolePrefix = uni.role === 'destination' ? '[★ Destino]' : '[Éxodo]';
      opt.textContent = `${rolePrefix} ${uni.community.toUpperCase()} #${uni.uniNumber} (${uni.serverData.name})`;
      frag.appendChild(opt);
    }
    this.dom.hsUniverseFilter.appendChild(frag);
  }

  renderHighscoreTable() {
    const cat = this.hsState.category;
    const rawList = this.mergedResult.highscores[cat] || [];
    
    let filtered = rawList;
    if (this.hsState.filterUni !== 'all') {
      filtered = filtered.filter(p => p.uniKey === this.hsState.filterUni);
    }
    if (this.hsState.query) {
      filtered = filtered.filter(p => {
        const nameMatch = p.name.toLowerCase().includes(this.hsState.query);
        const origMatch = p.originalName.toLowerCase().includes(this.hsState.query);
        return nameMatch || origMatch;
      });
    }

    const totalRecords = filtered.length;
    const startIdx = (this.hsState.page - 1) * this.hsState.pageSize;
    const endIdx = Math.min(startIdx + this.hsState.pageSize, totalRecords);
    const pageRecords = filtered.slice(startIdx, endIdx);

    this.dom.hsPaginationInfo.textContent = totalRecords > 0 
      ? `Mostrando ${startIdx + 1}-${endIdx} de ${totalRecords.toLocaleString()} jugadores`
      : 'No se encontraron resultados';
    
    this.dom.hsPrevPageBtn.disabled = this.hsState.page <= 1;
    this.dom.hsNextPageBtn.disabled = endIdx >= totalRecords;

    const frag = document.createDocumentFragment();
    for (const item of pageRecords) {
      const tr = document.createElement('tr');
      
      let deltaHtml = '<span class="delta-badge delta-none">0</span>';
      if (item.delta > 0) {
        deltaHtml = `<span class="delta-badge delta-up">▲ +${item.delta}</span>`;
      } else if (item.delta < 0) {
        deltaHtml = `<span class="delta-badge delta-down">▼ ${item.delta}</span>`;
      }

      let statusTag = '';
      if (item.status && item.status.includes('v')) {
        statusTag += '<span class="player-status-tag tag-v">v</span>';
      }
      if (item.status && (item.status.includes('i') || item.status.includes('I'))) {
        statusTag += '<span class="player-status-tag tag-i">i</span>';
      }
      if (item.collisionName) {
        statusTag += '<span class="player-status-tag tag-collision" title="Nombre renombrado por conflicto">renombrado</span>';
      }

      let allianceName = '-';
      if (item.allianceId && this.mergedResult.alliances.has(item.allianceId)) {
        const all = this.mergedResult.alliances.get(item.allianceId);
        allianceName = `[${all.displayTag || all.tag}]`;
      }

      const roleBadge = item.role === 'destination' 
        ? '<span style="color: var(--accent-cyan); font-size: 0.72rem; font-weight: 700;">★</span> '
        : '';
      const uniLabel = item.uniKey ? `${roleBadge}${item.uniKey.replace('_', ' #').toUpperCase()}` : '-';

      tr.innerHTML = `
        <td class="mono-cell" style="font-weight: 700; color: #fff;">${item.rank}</td>
        <td>${deltaHtml}</td>
        <td>
          <span style="font-weight: 600; color: #fff;">${this.escapeHtml(item.name)}</span>
          ${statusTag}
        </td>
        <td><span style="color: var(--accent-cyan); font-family: var(--font-mono);">${this.escapeHtml(allianceName)}</span></td>
        <td class="mono-cell" style="font-size: 0.8rem; color: var(--text-muted);">${uniLabel}</td>
        <td class="mono-cell" style="text-align: right; font-weight: 600; color: var(--accent-orange);">${item.score.toLocaleString()}</td>
        <td class="mono-cell" style="text-align: right; color: var(--text-muted);">${item.planetsCount}</td>
      `;
      frag.appendChild(tr);
    }

    this.dom.highscoreTableBody.innerHTML = '';
    this.dom.highscoreTableBody.appendChild(frag);
  }

  renderGalaxySystem() {
    const curG = this.galaxyState.galaxy;
    const curS = this.galaxyState.system;

    const planetsInSys = this.mergedResult.planets.filter(
      pl => pl.coords.g === curG && pl.coords.s === curS
    );

    const slotMap = new Map();
    for (const pl of planetsInSys) {
      slotMap.set(pl.coords.p, pl);
    }

    this.dom.galaxySysSummary.textContent = `Ocupación: ${planetsInSys.length} / 15 slots`;

    const frag = document.createDocumentFragment();

    for (let pos = 1; pos <= 15; pos++) {
      const card = document.createElement('div');
      const pl = slotMap.get(pos);

      if (!pl) {
        card.className = 'slot-card empty';
        card.innerHTML = `
          <div class="slot-header">
            <span>[${curG}:${curS}:${pos}]</span>
            <span style="color: var(--text-muted);">Vacante</span>
          </div>
          <div class="slot-planet-name" style="color: var(--text-muted);">Slot Disponible</div>
        `;
      } else {
        const owner = this.mergedResult.players.get(pl.playerId);
        const ownerName = owner ? (owner.displayName || owner.name) : 'Desconocido';
        const roleTag = pl.role === 'destination' ? '★ Destino' : 'Éxodo';
        const ownerUni = `${roleTag} ${pl.uniKey.replace('_', ' #').toUpperCase()}`;

        let stateClass = '';
        let badgeHtml = '';

        if (pl.relocated) {
          stateClass = 'collision-relocated';
          badgeHtml = `<span style="font-size: 0.68rem; color: var(--accent-orange); font-family: var(--font-mono);">⚡ Reubicado (Orig: ${pl.originalCoords})</span>`;
        } else if (pl.hasCollision && pl.retained) {
          stateClass = 'collision-retained';
          badgeHtml = '<span style="font-size: 0.68rem; color: var(--accent-green); font-family: var(--font-mono);">🛡️ Retenido</span>';
        }

        const moonHtml = pl.moon 
          ? `<span class="slot-moon-badge">🌕 Luna (${pl.moon.size}km)</span>` 
          : '';

        card.className = `slot-card ${stateClass}`;
        card.innerHTML = `
          <div class="slot-header">
            <span style="color: var(--accent-cyan);">[${curG}:${curS}:${pos}]</span>
            <span>${moonHtml}</span>
          </div>
          <div class="slot-planet-name">
            <span>🪐</span> ${this.escapeHtml(pl.name)}
          </div>
          <div class="slot-player-info">
            <div>Comandante: <strong style="color: #fff;">${this.escapeHtml(ownerName)}</strong></div>
            <div style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted);">${ownerUni}</div>
          </div>
          <div>${badgeHtml}</div>
        `;
      }

      frag.appendChild(card);
    }

    this.dom.systemSlotsGrid.innerHTML = '';
    this.dom.systemSlotsGrid.appendChild(frag);
  }

  renderConflictsView() {
    const coords = this.mergedResult.conflicts.coordinates;
    const nicks = this.mergedResult.conflicts.nicknames;

    // 1. Coordinate Conflicts
    if (coords.length === 0) {
      this.dom.coordConflictsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No se detectaron colisiones de coordenadas en este conjunto de servidores.</p>';
    } else {
      const frag = document.createDocumentFragment();
      for (const c of coords) {
        const item = document.createElement('div');
        item.className = 'conflict-box';
        const roleA = c.retainedPlayer.role === 'destination' ? '[★ Anfitrión]' : '[Éxodo]';
        const roleB = c.displacedPlayer.role === 'destination' ? '[★ Anfitrión]' : '[Éxodo]';

        item.innerHTML = `
          <div>
            <div>
              <span class="conflict-coords">[${c.originalCoords}]</span>
              <strong style="color: #fff; margin-left: 0.4rem;">${this.escapeHtml(c.planetName)}</strong>
              <span style="color: var(--text-muted); font-size: 0.8rem;">(Jugador: ${this.escapeHtml(c.displacedPlayer.name)} · ${roleB} ${c.displacedPlayer.uniKey.toUpperCase()})</span>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">
              Conservó posición: <strong style="color: var(--accent-green);">${this.escapeHtml(c.retainedPlayer.name)}</strong> (${roleA} ${c.retainedPlayer.uniKey.toUpperCase()} - ${c.retainedPlayer.score.toLocaleString()} pts) frente a ${c.displacedPlayer.score.toLocaleString()} pts.
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Nueva Coordenada:</div>
            <div style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-orange); font-size: 1rem;">
              [${c.newCoords}]
            </div>
          </div>
        `;
        frag.appendChild(item);
      }
      this.dom.coordConflictsList.innerHTML = '';
      this.dom.coordConflictsList.appendChild(frag);
    }

    // 2. Nick Conflicts
    if (nicks.length === 0) {
      this.dom.nickConflictsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No se detectaron conflictos de nombres de jugador.</p>';
    } else {
      const frag = document.createDocumentFragment();
      for (const n of nicks) {
        const item = document.createElement('div');
        item.className = 'conflict-box';
        item.style.borderLeftColor = 'var(--accent-cyan)';
        item.innerHTML = `
          <div>
            <div>
              Nombre original en colisión: <strong style="color: #fff;">${this.escapeHtml(n.originalName)}</strong>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">
              El jugador del universo ${n.keeperUniKey.toUpperCase()} mantuvo el nombre original por prioridad de servidor anfitrión/puntos.
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Nuevo Nick Asignado:</div>
            <div style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan); font-size: 0.95rem;">
              ${this.escapeHtml(n.assignedName)}
            </div>
          </div>
        `;
        frag.appendChild(item);
      }
      this.dom.nickConflictsList.innerHTML = '';
      this.dom.nickConflictsList.appendChild(frag);
    }
  }

  exportMergedJson() {
    if (!this.mergedResult) return;
    const exportData = {
      destination: this.mergedResult.destination,
      analytics: {
        ...this.mergedResult.analytics,
        systemDensity: Array.from(this.mergedResult.analytics.systemDensity.entries())
      },
      conflicts: this.mergedResult.conflicts,
      highscores: this.mergedResult.highscores,
      planetsCount: this.mergedResult.planets.length
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ogame_merged_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  resetSession() {
    this.loadedUniverses.clear();
    this.mergedResult = null;
    this.dom.universesList.innerHTML = '';
    this.dom.universesList.appendChild(this.dom.emptyUniPlaceholder);
    this.dom.resultsContainer.classList.add('hidden');
    this.updateMergeActionState();
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.__ogameApp = new OgameMergerApp();
});
