import { OgameApiClient } from './ogameApi.js';
import { UniverseMergeEngine } from './mergeEngine.js';
import { UniverseStorage } from './storage.js';
import { UiIngestController } from './uiIngest.js';

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
    this.storage = new UniverseStorage();
    this.loadedUniverses = new Map();
    this.mergedResult = null;
    this.currentGroup = 1;

    this.activeTab = 'tabOverview';
    this.hsState = {
      category: 'total',
      filterUni: 'all',
      filterSpeed: 'all',
      query: '',
      page: 1,
      pageSize: 50
    };

    this.galaxyState = {
      galaxy: 1,
      system: 1
    };

    this.initDomReferences();
    this.initIngestModule();
    this.bindEvents();
    this.renderMigrationGroupDetails(1);
    this.initGalaxySelectOptions();

    // Auto-load existing saved universes from IndexedDB
    this.loadSavedUniversesFromStorage();
  }

  initDomReferences() {
    this.dom = {
      // Ingest Mode Switcher
      modeBypassBtn: document.getElementById('modeBypassBtn'),
      modeAutoFetchBtn: document.getElementById('modeAutoFetchBtn'),
      bypassIngestContainer: document.getElementById('bypassIngestContainer'),
      autoFetchContainer: document.getElementById('autoFetchContainer'),

      // Fallback Proxy
      proxySelect: document.getElementById('proxySelect'),
      customProxyInput: document.getElementById('customProxyInput'),

      // Migration Groups
      groupTabButtons: document.querySelectorAll('.group-tab-btn'),
      groupDetailsContainer: document.getElementById('groupDetailsContainer'),

      // Universe Setup (Auto Fetch)
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

      // Universes List & Fusion Action
      universesList: document.getElementById('universesList'),
      emptyUniPlaceholder: document.getElementById('emptyUniPlaceholder'),
      mergeStatusText: document.getElementById('mergeStatusText'),
      runMergeBtn: document.getElementById('runMergeBtn'),

      // Results Tabs & Containers
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
      statSpeedGreen: document.getElementById('statSpeedGreen'),
      statSpeedYellow: document.getElementById('statSpeedYellow'),
      statSpeedRed: document.getElementById('statSpeedRed'),

      // Tab 2: Highscores
      hsCategorySelect: document.getElementById('hsCategorySelect'),
      hsUniverseFilter: document.getElementById('hsUniverseFilter'),
      hsSpeedFilter: document.getElementById('hsSpeedFilter'),
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

      // Tab 5: Export & Import
      exportJsonBtn: document.getElementById('exportJsonBtn'),
      resetSessionBtn: document.getElementById('resetSessionBtn'),
      importJsonInput: document.getElementById('importJsonInput'),
      importJsonTabInput: document.getElementById('importJsonTabInput'),
      importTabStatus: document.getElementById('importTabStatus')
    };
  }

  initIngestModule() {
    this.ingestController = new UiIngestController({
      container: this.dom.bypassIngestContainer,
      storage: this.storage,
      onUniverseReady: (uData) => {
        this.loadedUniverses.set(uData.uniKey, uData);
        this.renderUniversesList();
        this.updateMergeActionState();
      },
      onUniverseDeleted: (uniKey) => {
        if (uniKey === 'all') {
          this.loadedUniverses.clear();
        } else {
          this.loadedUniverses.delete(uniKey);
        }
        this.renderUniversesList();
        this.updateMergeActionState();
      },
      onUniverseRoleChanged: (uniKey, newRole, updatedUni) => {
        this.loadedUniverses.set(uniKey, updatedUni);
        this.renderUniversesList();
        if (this.mergedResult) {
          this.executeSimulation();
        }
      }
    });
  }

  async loadSavedUniversesFromStorage() {
    try {
      const saved = await this.storage.getAllUniverses();
      for (const u of saved) {
        this.loadedUniverses.set(u.uniKey, u);
      }
      this.renderUniversesList();
      this.updateMergeActionState();
    } catch (err) {
      console.warn('Could not load cached universes from IndexedDB:', err);
    }
  }

  bindEvents() {
    // Mode switcher
    this.dom.modeBypassBtn.addEventListener('click', () => {
      this.dom.modeBypassBtn.className = 'bg-cyan-500/10 border border-cyan-500 text-cyan-400 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 transition';
      this.dom.modeAutoFetchBtn.className = 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs px-4 py-2 rounded flex items-center gap-2 transition';
      this.dom.bypassIngestContainer.classList.remove('hidden');
      this.dom.autoFetchContainer.classList.add('hidden');
    });

    this.dom.modeAutoFetchBtn.addEventListener('click', () => {
      this.dom.modeAutoFetchBtn.className = 'bg-cyan-500/10 border border-cyan-500 text-cyan-400 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 transition';
      this.dom.modeBypassBtn.className = 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs px-4 py-2 rounded flex items-center gap-2 transition';
      this.dom.bypassIngestContainer.classList.add('hidden');
      this.dom.autoFetchContainer.classList.remove('hidden');
    });

    // Fallback Proxy Selection
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

    // Legacy auto-fetch form
    this.dom.addUniverseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const comm = this.dom.communityInput.value.trim().toLowerCase();
      const uniNum = parseInt(this.dom.uniNumberInput.value.trim(), 10);
      const role = this.dom.uniRoleSelect.value;
      if (comm && uniNum) {
        await this.loadSingleUniverseViaProxy(comm, uniNum, role);
      }
    });

    // universes.xml auto-discovery
    this.dom.loadCommunityListBtn.addEventListener('click', async () => {
      const comm = this.dom.communityInput.value.trim().toLowerCase() || 'es';
      this.dom.loadCommunityListBtn.disabled = true;
      this.dom.loadCommunityListBtn.textContent = 'Descargando...';

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
        this.dom.loadCommunityListBtn.innerHTML = '<span>🌐</span> Ver Universos';
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

    // Results tabs
    this.dom.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
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

    if (this.dom.hsSpeedFilter) {
      this.dom.hsSpeedFilter.addEventListener('change', (e) => {
        this.hsState.filterSpeed = e.target.value;
        this.hsState.page = 1;
        this.renderHighscoreTable();
      });
    }

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

    // Galaxy controls
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
      this.galaxyState.system = this.galaxyState.system > 1 ? this.galaxyState.system - 1 : maxSys;
      this.dom.systemInput.value = this.galaxyState.system;
      this.renderGalaxySystem();
    });

    this.dom.sysNextBtn.addEventListener('click', () => {
      const maxSys = this.mergedResult?.destination?.systems || 499;
      this.galaxyState.system = this.galaxyState.system < maxSys ? this.galaxyState.system + 1 : 1;
      this.dom.systemInput.value = this.galaxyState.system;
      this.renderGalaxySystem();
    });

    // Export, Import & Reset
    this.dom.exportJsonBtn.addEventListener('click', () => {
      this.exportMergedJson();
    });

    this.dom.resetSessionBtn.addEventListener('click', () => {
      if (confirm('¿Deseas reiniciar la sesión y borrar la simulación actual?')) {
        this.resetSession();
      }
    });

    if (this.dom.importJsonInput) {
      this.dom.importJsonInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          await this.importMergedJson(file);
        }
        e.target.value = '';
      });
    }

    if (this.dom.importJsonTabInput) {
      this.dom.importJsonTabInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          if (this.dom.importTabStatus) {
            this.dom.importTabStatus.textContent = file.name;
          }
          await this.importMergedJson(file);
        }
        e.target.value = '';
      });
    }
  }

  renderMigrationGroupDetails(groupId) {
    const group = MIGRATION_GROUPS[groupId];
    if (!group) return;

    const comm = 'es';
    const frag = document.createDocumentFragment();

    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 col-span-full';

    // Left: Exodus
    const exodusBox = document.createElement('div');
    exodusBox.innerHTML = `
      <div class="font-bold text-amber-400 mb-2 flex items-center gap-1.5 text-xs">
        <span>🚪</span> Universos de Éxodo (Servidores a Migrar):
      </div>
      <div class="flex flex-wrap gap-1.5" id="exodusChipsContainer"></div>
    `;

    const exodusChips = exodusBox.querySelector('#exodusChipsContainer');
    for (const u of group.exodus) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-btn text-[11px]';
      btn.textContent = `${u.name} (${u.id})`;
      btn.addEventListener('click', () => {
        this.loadSingleUniverseViaProxy(comm, u.id, 'exodus');
      });
      exodusChips.appendChild(btn);
    }

    // Right: Destinations
    const destBox = document.createElement('div');
    destBox.innerHTML = `
      <div class="font-bold text-cyan-400 mb-2 flex items-center gap-1.5 text-xs">
        <span>🎯</span> Universos Destino (Anfitriones):
      </div>
      <div class="flex flex-wrap gap-1.5" id="destChipsContainer"></div>
    `;

    const destChips = destBox.querySelector('#destChipsContainer');
    for (const u of group.destinations) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-btn text-[11px] border-cyan-500/40 text-cyan-300';
      btn.textContent = `★ ${u.name} (${u.id})`;
      btn.addEventListener('click', () => {
        this.loadSingleUniverseViaProxy(comm, u.id, 'destination');
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

  async loadSingleUniverseViaProxy(community, uniNumber, role = 'exodus') {
    const uniKey = `${community}_${uniNumber}`;

    if (this.loadedUniverses.has(uniKey)) {
      alert(`El universo ${community.toUpperCase()} #${uniNumber} ya está en la lista.`);
      return;
    }

    const card = this.createProxyUniverseCard(uniKey, community, uniNumber, role);
    this.dom.universesList.appendChild(card);
    if (this.dom.emptyUniPlaceholder) this.dom.emptyUniPlaceholder.remove();

    try {
      const universeData = await this.apiClient.fetchUniverseData(
        community,
        uniNumber,
        role,
        (progress) => {
          const bar = card.querySelector('.progress-bar');
          const label = card.querySelector('.uni-stats-line span');
          if (bar) bar.style.width = `${progress.percent}%`;
          if (label) label.textContent = `${progress.label} (${progress.current}/${progress.total})`;
        }
      );

      this.loadedUniverses.set(uniKey, universeData);
      await this.storage.saveUniverse(universeData);
      this.renderUniversesList();
      this.updateMergeActionState();
      this.ingestController.refreshSavedUniversesList();
    } catch (err) {
      card.classList.remove('loading');
      card.classList.add('error');
      const badge = card.querySelector('.uni-status-badge');
      if (badge) {
        badge.className = 'uni-status-badge badge-error';
        badge.textContent = 'Error 403 / CORS';
      }
      const statsLine = card.querySelector('.uni-stats-line');
      if (statsLine) {
        statsLine.innerHTML = `<span style="color: var(--accent-red); font-size: 0.75rem;">${err.message}. Usa la pestaña de Ingesta Desacoplada Anti-CORS.</span>`;
      }
    }
  }

  createProxyUniverseCard(uniKey, community, uniNumber, role) {
    const card = document.createElement('div');
    card.id = `card_${uniKey}`;
    card.className = 'universe-card loading';

    const roleTag = role === 'destination' ? '[★ DESTINO]' : '[ÉXODO]';

    card.innerHTML = `
      <div class="uni-info-main flex-1">
        <div class="uni-title">
          <span>${roleTag} Servidor ${community.toUpperCase()} #${uniNumber}</span>
          <span class="uni-status-badge badge-loading">Descargando...</span>
        </div>
        <div class="uni-stats-line" id="stats_${uniKey}">
          <span>Iniciando conexión con Gameforge XML...</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar"></div>
        </div>
      </div>
      <div>
        <button type="button" class="btn btn-secondary text-xs px-2 py-1" data-remove="${uniKey}">✖</button>
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

  renderUniversesList() {
    this.dom.universesList.innerHTML = '';

    if (this.loadedUniverses.size === 0) {
      if (this.dom.emptyUniPlaceholder) {
        this.dom.universesList.appendChild(this.dom.emptyUniPlaceholder);
      }
      return;
    }

    const frag = document.createDocumentFragment();

    for (const [uniKey, data] of this.loadedUniverses.entries()) {
      const card = document.createElement('div');
      card.className = 'universe-card ready';

      const isDest = data.role === 'destination';
      const roleBadge = isDest 
        ? '<span class="text-cyan-400 font-bold">[★ DESTINO]</span>'
        : '<span class="text-amber-400 font-bold">[ÉXODO]</span>';

      card.innerHTML = `
        <div class="uni-info-main flex-1">
          <div class="uni-title">
            <span>${roleBadge} Servidor ${data.community.toUpperCase()} #${data.uniNumber} (${data.serverData?.name || 'Uni'})</span>
            <span class="uni-status-badge badge-ready">Listo</span>
          </div>
          <div class="uni-stats-line">
            <span>👥 ${data.players.size.toLocaleString()} Jugadores</span>
            <span>🪐 ${data.planets.length.toLocaleString()} Planetas</span>
            <span>🛡️ ${data.alliances.size.toLocaleString()} Alianzas</span>
            <span>⚡ Vel Flota x${data.serverData?.speedFleetWar || data.serverData?.speedFleet || 1}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2 py-1 rounded">
            <label class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tipo:</label>
            <select class="change-role-select bg-slate-950 text-xs rounded px-2 py-1 font-bold cursor-pointer ${isDest ? 'text-cyan-400 border border-cyan-500/50' : 'text-amber-400 border border-amber-500/50'}" data-unikey="${uniKey}">
              <option value="destination" ${isDest ? 'selected' : ''}>★ Destino (Anfitrión)</option>
              <option value="exodus" ${!isDest ? 'selected' : ''}>Éxodo (Migrante)</option>
            </select>
          </div>
          <button type="button" class="btn btn-secondary text-xs px-2 py-1" data-remove="${uniKey}" title="Eliminar universo">✖</button>
        </div>
      `;

      card.querySelector(`.change-role-select[data-unikey="${uniKey}"]`).addEventListener('change', async (e) => {
        await this.updateUniverseRole(uniKey, e.target.value);
      });

      card.querySelector(`[data-remove="${uniKey}"]`).addEventListener('click', async () => {
        this.loadedUniverses.delete(uniKey);
        await this.storage.deleteUniverse(uniKey);
        this.renderUniversesList();
        this.updateMergeActionState();
        this.ingestController.refreshSavedUniversesList();
      });

      frag.appendChild(card);
    }

    this.dom.universesList.appendChild(frag);
  }

  async updateUniverseRole(uniKey, newRole) {
    const data = this.loadedUniverses.get(uniKey);
    if (!data) return;

    data.role = newRole;
    if (data.serverData) {
      data.serverData.role = newRole;
    }

    if (data.players) {
      for (const player of data.players.values()) {
        player.role = newRole;
      }
    }

    if (data.planets) {
      for (const planet of data.planets) {
        planet.role = newRole;
      }
    }

    // Persist changes to IndexedDB
    await this.storage.saveUniverse(data);

    // Refresh UI lists
    this.renderUniversesList();
    this.ingestController.refreshSavedUniversesList();

    // If a merge simulation was already performed, re-execute immediately
    if (this.mergedResult) {
      this.executeSimulation();
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
      this.dom.mergeStatusText.textContent = `Estado: ${readyCount} universo cargado. Se requiere al menos 2 servidores para simular.`;
      this.dom.mergeStatusText.style.color = 'var(--text-muted)';
    }
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
      this.dom.resultsContainer.scrollIntoView({ behavior: 'smooth' });
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

    const sc = a.speedCounts || { green: 0, yellow: 0, red: 0 };
    if (this.dom.statSpeedGreen) this.dom.statSpeedGreen.textContent = `x1: ${sc.green.toLocaleString()}`;
    if (this.dom.statSpeedYellow) this.dom.statSpeedYellow.textContent = `x2-4: ${sc.yellow.toLocaleString()}`;
    if (this.dom.statSpeedRed) this.dom.statSpeedRed.textContent = `x6+: ${sc.red.toLocaleString()}`;

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
      opt.textContent = `${rolePrefix} ${uni.community.toUpperCase()} #${uni.uniNumber} (${uni.serverData?.name || 'Uni'})`;
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
    if (this.hsState.filterSpeed !== 'all') {
      filtered = filtered.filter(p => p.speedTrafficLight?.category === this.hsState.filterSpeed);
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

      const speedLight = item.speedTrafficLight || { badgeClass: 'badge-speed-green', label: 'x1' };
      const speedPill = `<span class="badge-speed ${speedLight.badgeClass}" title="${speedLight.desc || speedLight.text}">${speedLight.label} Flota</span>`;

      tr.innerHTML = `
        <td class="mono-cell" style="font-weight: 700; color: #fff;">${item.rank}</td>
        <td>${deltaHtml}</td>
        <td>
          <span style="font-weight: 600; color: #fff;">${this.escapeHtml(item.name)}</span>
          ${statusTag}
        </td>
        <td><span style="color: var(--accent-cyan); font-family: var(--font-mono);">${this.escapeHtml(allianceName)}</span></td>
        <td class="mono-cell" style="font-size: 0.8rem; color: var(--text-muted);">${uniLabel}</td>
        <td>${speedPill}</td>
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

        const speedLight = pl.speedTrafficLight || owner?.speedTrafficLight || { badgeClass: 'badge-speed-green', label: 'x1' };
        const speedPill = `<span class="badge-speed ${speedLight.badgeClass}" style="font-size: 0.65rem; padding: 0.08rem 0.35rem; margin-left: 0.35rem;">${speedLight.label}</span>`;

        let statusPills = '';
        if (owner?.status?.includes('v')) statusPills += '<span class="player-status-tag tag-v">v</span>';
        if (owner?.status?.includes('i') || owner?.status?.includes('I')) statusPills += '<span class="player-status-tag tag-i">i</span>';
        if (owner?.collisionName) statusPills += '<span class="player-status-tag tag-collision">renombrado</span>';

        // Recalculated rankings and scores in merged universe
        const ranks = owner?.mergedRanks || {};
        const scores = owner?.scores || {};
        const rankTotalNum = ranks.total ? `${ranks.total.toLocaleString()}` : '-';
        const rankMilNum = ranks.military ? `${ranks.military.toLocaleString()}` : '-';
        const rankEcoNum = ranks.economy ? `${ranks.economy.toLocaleString()}` : '-';
        const rankResNum = ranks.research ? `${ranks.research.toLocaleString()}` : '-';

        const scoreTotal = (scores.total || 0).toLocaleString();
        const scoreMil = (scores.military || 0).toLocaleString();
        const scoreEco = (scores.economy || 0).toLocaleString();
        const scoreRes = (scores.research || 0).toLocaleString();

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
            <div style="display: flex; align-items: center; gap: 0.25rem; flex-wrap: wrap;">
              <span>Comandante:</span>
              <strong style="color: #fff;">${this.escapeHtml(ownerName)}</strong>
              ${statusPills}
            </div>
            <div style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted); display: flex; align-items: center; margin-top: 0.15rem;">
              <span>${ownerUni}</span>
              ${speedPill}
            </div>
          </div>
          <div>${badgeHtml}</div>

          <!-- Clasificación y Puntuación Unificada del Jugador -->
          <div class="slot-ranks-grid" style="display: flex; flex-direction: column; gap: 0.25rem; font-family: var(--font-mono); font-size: 0.72rem; margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0.2rem 0.45rem; border-radius: 3px;" title="Total: Lugar ${rankTotalNum} (${scoreTotal} puntos)">
              <span>🏆 <span style="color: var(--text-muted);">Total:</span> <strong style="color: #fff;">Lugar ${rankTotalNum}</strong></span>
              <span style="color: var(--text-muted); font-size: 0.68rem;">(${scoreTotal} pts)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0.2rem 0.45rem; border-radius: 3px;" title="Flota: Lugar ${rankMilNum} (${scoreMil} puntos)">
              <span>⚔️ <span style="color: var(--accent-orange);">Flota:</span> <strong style="color: var(--accent-orange);">Lugar ${rankMilNum}</strong></span>
              <span style="color: rgba(255, 157, 0, 0.85); font-size: 0.68rem;">(${scoreMil} pts)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0.2rem 0.45rem; border-radius: 3px;" title="Economía: Lugar ${rankEcoNum} (${scoreEco} puntos)">
              <span>🪙 <span style="color: #fbbf24;">Eco:</span> <strong style="color: #fbbf24;">Lugar ${rankEcoNum}</strong></span>
              <span style="color: rgba(251, 191, 36, 0.85); font-size: 0.68rem;">(${scoreEco} pts)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0.2rem 0.45rem; border-radius: 3px;" title="Investigación: Lugar ${rankResNum} (${scoreRes} puntos)">
              <span>🔬 <span style="color: var(--accent-cyan);">Inv:</span> <strong style="color: var(--accent-cyan);">Lugar ${rankResNum}</strong></span>
              <span style="color: rgba(0, 240, 255, 0.85); font-size: 0.68rem;">(${scoreRes} pts)</span>
            </div>
          </div>
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

        const speedLightA = c.retainedPlayer.speedTrafficLight || { badgeClass: 'badge-speed-green', label: 'x1' };
        const speedLightB = c.displacedPlayer.speedTrafficLight || { badgeClass: 'badge-speed-green', label: 'x1' };
        const pillA = `<span class="badge-speed ${speedLightA.badgeClass}" style="font-size: 0.65rem; padding: 0.08rem 0.35rem;">${speedLightA.label} Flota</span>`;
        const pillB = `<span class="badge-speed ${speedLightB.badgeClass}" style="font-size: 0.65rem; padding: 0.08rem 0.35rem;">${speedLightB.label} Flota</span>`;

        item.innerHTML = `
          <div>
            <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
              <span class="conflict-coords">[${c.originalCoords}]</span>
              <strong style="color: #fff;">${this.escapeHtml(c.planetName)}</strong>
              <span style="color: var(--text-muted); font-size: 0.8rem;">(Jugador: ${this.escapeHtml(c.displacedPlayer.name)} · ${roleB} ${c.displacedPlayer.uniKey.toUpperCase()})</span>
              ${pillB}
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
              <span>Conservó posición: <strong style="color: var(--accent-green);">${this.escapeHtml(c.retainedPlayer.name)}</strong> (${roleA} ${c.retainedPlayer.uniKey.toUpperCase()} - ${c.retainedPlayer.score.toLocaleString()} pts) frente a ${c.displacedPlayer.score.toLocaleString()} pts.</span>
              ${pillA}
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
      version: 2,
      exportedAt: new Date().toISOString(),
      destination: this.mergedResult.destination,
      analytics: {
        ...this.mergedResult.analytics,
        systemDensity: this.mergedResult.analytics.systemDensity instanceof Map 
          ? Array.from(this.mergedResult.analytics.systemDensity.entries())
          : (Array.isArray(this.mergedResult.analytics.systemDensity) 
              ? this.mergedResult.analytics.systemDensity 
              : Object.entries(this.mergedResult.analytics.systemDensity || {}))
      },
      conflicts: this.mergedResult.conflicts,
      highscores: this.mergedResult.highscores,
      planetsCount: this.mergedResult.planets.length,
      planets: this.mergedResult.planets,
      players: this.mergedResult.players instanceof Map 
        ? Array.from(this.mergedResult.players.entries())
        : (Array.isArray(this.mergedResult.players) 
            ? this.mergedResult.players 
            : Object.entries(this.mergedResult.players || {})),
      alliances: this.mergedResult.alliances instanceof Map 
        ? Array.from(this.mergedResult.alliances.entries())
        : (Array.isArray(this.mergedResult.alliances) 
            ? this.mergedResult.alliances 
            : Object.entries(this.mergedResult.alliances || {})),
      sourceUniverses: Array.from(this.loadedUniverses.values()).map(u => ({
        community: u.community,
        uniNumber: u.uniNumber,
        uniKey: u.uniKey || `${u.community}_${u.uniNumber}`,
        role: u.role,
        serverData: u.serverData,
        endpointsLoaded: u.endpointsLoaded,
        playersCount: u.players?.size || (u.playersCount ?? 0),
        planetsCount: u.planets?.length || (u.planetsCount ?? 0),
        alliancesCount: u.alliances?.size || (u.alliancesCount ?? 0)
      }))
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

  async importMergedJson(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || (!data.highscores && !data.analytics && !data.destination)) {
        throw new Error('El archivo no tiene el formato válido de una simulación de universo de OGame.');
      }

      // Reconstruct players Map
      let playersMap = new Map();
      if (Array.isArray(data.players)) {
        playersMap = new Map(data.players);
      } else if (data.players && typeof data.players === 'object') {
        playersMap = new Map(Object.entries(data.players));
      } else if (data.highscores?.total) {
        // Fallback for older export format: reconstruct players from highscore list
        for (const p of data.highscores.total) {
          playersMap.set(p.id, {
            id: p.id,
            name: p.name,
            displayName: p.name,
            originalName: p.originalName || p.name,
            uniKey: p.uniKey,
            role: p.role,
            allianceId: p.allianceId,
            speedTrafficLight: p.speedTrafficLight,
            status: p.status,
            scores: { total: p.score },
            mergedRanks: { total: p.rank },
            ships: 0
          });
        }
      }

      // Reconstruct alliances Map
      let alliancesMap = new Map();
      if (Array.isArray(data.alliances)) {
        alliancesMap = new Map(data.alliances);
      } else if (data.alliances && typeof data.alliances === 'object') {
        alliancesMap = new Map(Object.entries(data.alliances));
      }

      // Reconstruct planets array
      const planets = Array.isArray(data.planets) ? data.planets : [];

      // Reconstruct systemDensity Map in analytics
      const analytics = data.analytics || {};
      if (Array.isArray(analytics.systemDensity)) {
        analytics.systemDensity = new Map(analytics.systemDensity);
      } else if (analytics.systemDensity && !(analytics.systemDensity instanceof Map)) {
        analytics.systemDensity = new Map(Object.entries(analytics.systemDensity));
      } else if (!analytics.systemDensity) {
        analytics.systemDensity = new Map();
      }

      // Set mergedResult
      this.mergedResult = {
        destination: data.destination || {
          name: 'Universo Importado',
          galaxies: 9,
          systems: 499,
          slotsPerSystem: 15
        },
        players: playersMap,
        alliances: alliancesMap,
        planets,
        highscores: data.highscores || {},
        conflicts: data.conflicts || {
          coordinates: [],
          nicknames: [],
          tags: []
        },
        analytics
      };

      // Restore source universes if available
      if (Array.isArray(data.sourceUniverses) && data.sourceUniverses.length > 0) {
        for (const u of data.sourceUniverses) {
          const key = u.uniKey || `${u.community}_${u.uniNumber}`;
          this.loadedUniverses.set(key, {
            ...u,
            uniKey: key,
            players: { size: u.playersCount || (u.players?.size ?? 0) },
            planets: { length: u.planetsCount || (u.planets?.length ?? 0) },
            alliances: { size: u.alliancesCount || (u.alliances?.size ?? 0) }
          });
        }
      } else {
        // Fallback: extract distinct uniKeys from players or highscores
        const distinctUnis = new Set();
        for (const p of playersMap.values()) {
          if (p.uniKey) distinctUnis.add(p.uniKey);
        }
        for (const key of distinctUnis) {
          if (!this.loadedUniverses.has(key)) {
            const parts = key.split('_');
            const comm = parts[0] || 'es';
            const num = parts[1] || '1';
            this.loadedUniverses.set(key, {
              community: comm,
              uniNumber: num,
              uniKey: key,
              role: 'destination',
              serverData: { name: `Uni ${num}` },
              players: { size: 0 },
              planets: { length: 0 },
              alliances: { size: 0 }
            });
          }
        }
      }

      // Update universe lists and actions
      this.renderUniversesList();
      this.updateMergeActionState();

      // Refresh filter options and galaxy selectors
      this.populateUniverseFilterOptions();
      this.initGalaxySelectOptions(this.mergedResult.destination?.galaxies || 9);

      // Render all simulation results
      this.renderOverviewMetrics();
      this.renderHighscoreTable();
      this.renderGalaxySystem();
      this.renderConflictsView();

      // Reveal results and navigate to overview
      this.dom.resultsContainer.classList.remove('hidden');
      this.switchTab('tabOverview');
      this.dom.resultsContainer.scrollIntoView({ behavior: 'smooth' });

      const totalPl = this.mergedResult.players.size || (this.mergedResult.highscores?.total?.length ?? 0);
      alert(`Simulación importada con éxito.\n• Jugadores: ${totalPl.toLocaleString()}\n• Planetas: ${planets.length.toLocaleString()}\n• Servidores detectados: ${this.loadedUniverses.size}`);
    } catch (err) {
      alert(`Error al importar el archivo JSON: ${err.message}`);
    }
  }

  resetSession() {
    this.mergedResult = null;
    this.dom.resultsContainer.classList.add('hidden');
    if (this.dom.importTabStatus) {
      this.dom.importTabStatus.textContent = 'Listo para cargar';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
