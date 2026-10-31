import { OgameApiClient } from './ogameApi.js?v=2.4';
import { UniverseMergeEngine } from './mergeEngine.js?v=2.4';
import { UniverseStorage } from './storage.js?v=2.4';
import { UiIngestController } from './uiIngest.js?v=2.4';

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

export class OgameMergerApp {
  constructor() {
    this.apiClient = new OgameApiClient({ proxyType: 'corsproxy' });
    this.storage = new UniverseStorage();
    this.loadedUniverses = new Map();
    this.mergedResult = null;
    this.currentGroup = 1;

    this.activeTab = 'tabDashboard';
    this.selectedRadarPlayer = null;
    this.activeDataSourceLabel = 'Inicializando...';

    this.hsState = {
      category: 'total',
      filterUni: 'all',
      filterSpeed: 'all',
      query: '',
      page: 1,
      pageSize: 50
    };

    this.conflictsState = {
      page: 1,
      pageSize: 50,
      query: ''
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

    // Auto-load existing saved universes from local or project file
    this.initInitialSimulationData();
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
      saveUniversesBtn: document.getElementById('saveUniversesBtn'),
      runMergeBtn: document.getElementById('runMergeBtn'),

      // Global Progress Bar
      globalProgressContainer: document.getElementById('globalProgressContainer'),
      globalProgressTitle: document.getElementById('globalProgressTitle'),
      globalProgressSubtext: document.getElementById('globalProgressSubtext'),
      globalProgressPercent: document.getElementById('globalProgressPercent'),
      globalProgressBar: document.getElementById('globalProgressBar'),
      globalProgressLogContainer: document.getElementById('globalProgressLogContainer'),
      globalProgressLog: document.getElementById('globalProgressLog'),

      // Results Tabs & Containers
      resultsContainer: document.getElementById('resultsContainer'),
      tabButtons: document.querySelectorAll('.tab-btn'),
      tabContents: document.querySelectorAll('.tab-content'),
      conflictsBadge: document.getElementById('conflictsBadge'),

      // Tab 0: Dynamic Dashboard
      btnTabDashboard: document.getElementById('btnTabDashboard'),
      btnTabPlayerRadar: document.getElementById('btnTabPlayerRadar'),
      dashboardSourceStatus: document.getElementById('dashboardSourceStatus'),
      dashLoadLocalBtn: document.getElementById('dashLoadLocalBtn'),
      dashProjectFileInput: document.getElementById('dashProjectFileInput'),
      dashServerCount: document.getElementById('dashServerCount'),
      dashServerList: document.getElementById('dashServerList'),
      dashPlayerCount: document.getElementById('dashPlayerCount'),
      dashActiveRatio: document.getElementById('dashActiveRatio'),
      dashPlanetCount: document.getElementById('dashPlanetCount'),
      dashCollisionRatio: document.getElementById('dashCollisionRatio'),
      dashTotalPoints: document.getElementById('dashTotalPoints'),
      dashFleetPoints: document.getElementById('dashFleetPoints'),
      dashGoToRadarBtn: document.getElementById('dashGoToRadarBtn'),
      dashUniversesContainer: document.getElementById('dashUniversesContainer'),
      dashSpeedGreenCount: document.getElementById('dashSpeedGreenCount'),
      dashSpeedYellowCount: document.getElementById('dashSpeedYellowCount'),
      dashSpeedRedCount: document.getElementById('dashSpeedRedCount'),

      // Tab 0.5: Player Radar
      radarPlayerSearchInput: document.getElementById('radarPlayerSearchInput'),
      clearRadarSearchBtn: document.getElementById('clearRadarSearchBtn'),
      radarPlayerSuggestions: document.getElementById('radarPlayerSuggestions'),
      radarSearchBtn: document.getElementById('radarSearchBtn'),
      radarQuickPlayerChips: document.getElementById('radarQuickPlayerChips'),
      radarPlayerResultContainer: document.getElementById('radarPlayerResultContainer'),

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
      coordConflictsSearch: document.getElementById('coordConflictsSearch'),
      coordConflictsPaginationInfo: document.getElementById('coordConflictsPaginationInfo'),
      coordConflictsPrevBtn: document.getElementById('coordConflictsPrevBtn'),
      coordConflictsNextBtn: document.getElementById('coordConflictsNextBtn'),

      // Tab 5: Export & Import
      exportJsonBtn: document.getElementById('exportJsonBtn'),
      resetSessionBtn: document.getElementById('resetSessionBtn'),
      importJsonInput: document.getElementById('importJsonInput'),
      importJsonTabInput: document.getElementById('importJsonTabInput'),
      importTabStatus: document.getElementById('importTabStatus'),

      // Slot Detail Modal (Original)
      slotDetailModal: document.getElementById('slotDetailModal'),
      modalSlotTitle: document.getElementById('modalSlotTitle'),
      modalSlotSubtitle: document.getElementById('modalSlotSubtitle'),
      modalSlotBody: document.getElementById('modalSlotBody'),
      closeSlotModalBtn: document.getElementById('closeSlotModalBtn'),
      closeSlotModalBtnBottom: document.getElementById('closeSlotModalBtnBottom'),

      // Minimalist 15-Column System Matrix Modal
      systemPositionsModal: document.getElementById('systemPositionsModal'),
      modalMatrixTitle: document.getElementById('modalMatrixTitle'),
      modalMatrixSubtitle: document.getElementById('modalMatrixSubtitle'),
      matrixOccupancyBadge: document.getElementById('matrixOccupancyBadge'),
      matrixTotalPlayersBadge: document.getElementById('matrixTotalPlayersBadge'),
      matrixTableBody: document.getElementById('matrixTableBody'),
      closeMatrixModalBtn: document.getElementById('closeMatrixModalBtn'),
      closeMatrixModalBtnBottom: document.getElementById('closeMatrixModalBtnBottom')
    };
  }

  yieldToUi(ms = 15) {
    return new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, ms)));
  }

  addProgressLog(message, type = 'info') {
    if (!this.dom.globalProgressLog) return;
    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    const item = document.createElement('div');
    const color = type === 'error' ? 'text-rose-400' : (type === 'success' ? 'text-emerald-400' : (type === 'warn' ? 'text-amber-400' : 'text-cyan-300'));
    item.className = `leading-tight text-[11px] font-mono ${color}`;
    item.textContent = `[${time}] ${message}`;
    this.dom.globalProgressLog.appendChild(item);
    if (this.dom.globalProgressLogContainer) {
      this.dom.globalProgressLogContainer.scrollTop = this.dom.globalProgressLogContainer.scrollHeight;
    }
  }

  showGlobalProgress(title, subtext = '', percent = 0) {
    if (!this.dom.globalProgressContainer) return;
    this.dom.globalProgressContainer.classList.remove('hidden');
    if (this.dom.globalProgressTitle) this.dom.globalProgressTitle.textContent = title;
    if (this.dom.globalProgressSubtext) this.dom.globalProgressSubtext.textContent = subtext;
    const p = Math.min(100, Math.max(0, percent));
    if (this.dom.globalProgressPercent) this.dom.globalProgressPercent.textContent = `${Math.round(p)}%`;
    if (this.dom.globalProgressBar) this.dom.globalProgressBar.style.width = `${p}%`;
    if (subtext) {
      this.addProgressLog(`${title ? title + ' → ' : ''}${subtext}`);
    }
  }

  async updateGlobalProgress(percent, title = null, subtext = null, delay = 15) {
    if (!this.dom.globalProgressContainer) return;
    this.dom.globalProgressContainer.classList.remove('hidden');
    if (title && this.dom.globalProgressTitle) this.dom.globalProgressTitle.textContent = title;
    if (subtext !== null && this.dom.globalProgressSubtext) this.dom.globalProgressSubtext.textContent = subtext;
    const p = Math.min(100, Math.max(0, percent));
    if (this.dom.globalProgressPercent) this.dom.globalProgressPercent.textContent = `${Math.round(p)}%`;
    if (this.dom.globalProgressBar) this.dom.globalProgressBar.style.width = `${p}%`;
    if (subtext) {
      this.addProgressLog(`${title ? title + ' → ' : ''}${subtext}`);
    }
    await this.yieldToUi(delay);
  }

  hideGlobalProgress(delayMs = 600) {
    setTimeout(() => {
      if (this.dom.globalProgressContainer) {
        this.dom.globalProgressContainer.classList.add('hidden');
      }
    }, delayMs);
  }

  initIngestModule() {
    this.ingestController = new UiIngestController({
      container: this.dom.bypassIngestContainer,
      storage: this.storage,
      onProgress: async (percent, title, subtext) => {
        await this.updateGlobalProgress(percent, title, subtext);
        if (percent >= 100) {
          this.hideGlobalProgress(700);
        } else if (percent === 0) {
          this.hideGlobalProgress(400);
        }
      },
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

  async healUniversesFromProjectData() {
    await this.updateGlobalProgress(30, 'Sincronizando Memoria', 'Cargando dataset maestro para reparar datos...');
    try {
      const response = await fetch('./data/ogame_simulation_latest.json');
      if (!response.ok) return;
      const data = await response.json();
      const masterUnis = this.extractUniversesFromData(data);

      for (const [key, masterUni] of masterUnis.entries()) {
        if (this.loadedUniverses.has(key)) {
          const current = this.loadedUniverses.get(key);
          const currPl = current.players instanceof Map ? current.players.size : (Array.isArray(current.players) ? current.players.length : 0);
          const currPlanets = Array.isArray(current.planets) ? current.planets.length : 0;
          if (currPl === 0 || currPlanets === 0 || !(current.players instanceof Map)) {
            masterUni.role = current.role || masterUni.role;
            this.loadedUniverses.set(key, masterUni);
            try {
              await this.storage.saveUniverse(masterUni);
            } catch (e) {}
          }
        } else {
          this.loadedUniverses.set(key, masterUni);
          try {
            await this.storage.saveUniverse(masterUni);
          } catch (e) {}
        }
      }

      this.renderUniversesList();
      this.updateMergeActionState();
      this.ingestController.refreshSavedUniversesList();
    } catch (err) {
      console.warn('Auto-healing check warning:', err);
    }
  }

  async initInitialSimulationData() {
    this.showGlobalProgress('Iniciando OGame Universe Merger', 'Accediendo a base de datos IndexedDB...', 10);
    this.addProgressLog('Iniciando motor cliente OGame Merger...');
    try {
      // 1. Try loading from IndexedDB with safe timeout fallback
      await this.updateGlobalProgress(25, 'Consultando Almacenamiento', 'Verificando universos en IndexedDB...');
      
      const saved = await Promise.race([
        this.storage.getAllUniverses(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout leyendo IndexedDB (3s)')), 3000))
      ]).catch(err => {
        this.addProgressLog(`Aviso IndexedDB: ${err.message}`, 'warn');
        return [];
      });

      let hasRealContent = false;
      if (saved && saved.length >= 2) {
        const totalPl = saved.reduce((acc, u) => acc + (u.players?.size || 0), 0);
        const totalPlanets = saved.reduce((acc, u) => acc + (u.planets?.length || 0), 0);
        this.addProgressLog(`Registros encontrados en memoria: ${saved.length} universos (${totalPl.toLocaleString()} jugadores, ${totalPlanets.toLocaleString()} planetas).`);
        if (totalPl > 50 && totalPlanets > 50) {
          hasRealContent = true;
        }
      } else {
        this.addProgressLog(`Almacenamiento local contiene ${saved ? saved.length : 0} universo(s).`, 'warn');
      }

      if (hasRealContent) {
        for (const u of saved) {
          this.loadedUniverses.set(u.uniKey, u);
        }
        this.renderUniversesList();
        this.updateMergeActionState();
        await this.updateGlobalProgress(60, 'Restaurando Simulación Local', `Cargando ${this.loadedUniverses.size} universos desde memoria...`);
        this.addProgressLog(`Ejecutando motor de fusión para ${this.loadedUniverses.size} universos locales...`);
        await this.executeSimulation();
        this.activeDataSourceLabel = `Almacenamiento Local (IndexedDB · ${this.loadedUniverses.size} Universos)`;
        if (this.dom.dashboardSourceStatus) {
          this.dom.dashboardSourceStatus.textContent = `Fuente Activa: ${this.activeDataSourceLabel}`;
        }
        this.addProgressLog('Memoria local restaurada correctamente.', 'success');
        await this.updateGlobalProgress(100, 'Memoria Restaurada', 'Simulación local lista');
        this.hideGlobalProgress(1200);
        return;
      }

      // 2. Otherwise: load project's latest generated simulation file from data/
      this.addProgressLog('Recargando memoria local desde dataset maestro ogame_simulation_latest.json...');
      await this.loadProjectGeneratedFile('data/ogame_simulation_latest.json');
    } catch (err) {
      this.addProgressLog(`Error en carga inicial: ${err.message}`, 'error');
      console.warn('Initial data load attempt error:', err);
      try {
        await this.loadProjectGeneratedFile('data/ogame_simulation_latest.json');
      } catch (err2) {
        this.addProgressLog(`Fallback también falló: ${err2.message}`, 'error');
        this.hideGlobalProgress(600);
      }
    }
  }

  async loadProjectGeneratedFile(filePath = 'data/ogame_simulation_latest.json') {
    const cleanPath = filePath.startsWith('./') ? filePath : `./${filePath}`;
    const fileName = filePath.split('/').pop();
    if (this.dom.dashboardSourceStatus) {
      this.dom.dashboardSourceStatus.textContent = `Cargando datos (${fileName})...`;
    }
    await this.updateGlobalProgress(35, 'Cargando Memoria del Proyecto', `Descargando ${fileName} desde almacenamiento...`);
    try {
      const response = await fetch(cleanPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} al leer ${cleanPath}`);
      }
      await this.updateGlobalProgress(55, 'Procesando Dataset Masivo', 'Parseando estructura JSON de la simulación...');
      const data = await response.json();
      await this.hydrateSimulationData(data, `Memoria del Proyecto (${fileName})`, false);

      // Persist hydrated universes to IndexedDB in an atomic batch
      await this.storage.saveAllUniverses(this.loadedUniverses);
      this.ingestController.refreshSavedUniversesList();

      await this.updateGlobalProgress(100, 'Sistema Inicializado', `Dataset ${fileName} cargado con éxito`);
      this.hideGlobalProgress(700);
    } catch (err) {
      console.error(`Error cargando archivo de proyecto ${filePath}:`, err);
      if (this.dom.dashboardSourceStatus) {
        this.dom.dashboardSourceStatus.textContent = `Error: ${err.message}`;
      }
      this.hideGlobalProgress(400);
    }
  }

  async loadFromLocalIndexedDB() {
    this.showGlobalProgress('Almacenamiento Local', 'Consultando base de datos IndexedDB...', 20);
    try {
      const saved = await this.storage.getAllUniverses();
      let hasRealContent = false;
      if (saved && saved.length >= 2) {
        const totalPl = saved.reduce((acc, u) => acc + (u.players?.size || 0), 0);
        const totalPlanets = saved.reduce((acc, u) => acc + (u.planets?.length || 0), 0);
        if (totalPl > 50 && totalPlanets > 50) {
          hasRealContent = true;
        }
      }

      if (!hasRealContent) {
        this.hideGlobalProgress(200);
        const recharge = confirm(
          `Almacenamiento local insuficiente: solo hay ${saved ? saved.length : 0} universo(s) en IndexedDB.\n\n` +
          `¿Deseas recargar la memoria local con los 32 universos del censo (6.128 jugadores y 40.802 planetas) y guardarlos en IndexedDB?`
        );
        if (recharge) {
          await this.loadProjectGeneratedFile('data/ogame_simulation_latest.json');
        }
        return;
      }
      await this.updateGlobalProgress(50, 'Preparando Universos', `Extrayendo ${saved.length} universos de IndexedDB...`);
      this.loadedUniverses.clear();
      for (const u of saved) {
        this.loadedUniverses.set(u.uniKey, u);
      }
      this.renderUniversesList();
      this.updateMergeActionState();
      await this.updateGlobalProgress(75, 'Ejecutando Fusión', 'Calculando colisiones y clasificaciones...');
      await this.executeSimulation();
      this.activeDataSourceLabel = `Almacenamiento Local (IndexedDB · ${this.loadedUniverses.size} Universos)`;
      if (this.dom.dashboardSourceStatus) {
        this.dom.dashboardSourceStatus.textContent = `Fuente Activa: ${this.activeDataSourceLabel}`;
      }
      await this.updateGlobalProgress(100, 'Carga Completada', `${this.loadedUniverses.size} universos sincronizados`);
      this.hideGlobalProgress(700);
    } catch (err) {
      this.hideGlobalProgress(200);
      alert(`Error leyendo IndexedDB local: ${err.message}`);
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

    // Save loaded universes to IndexedDB
    if (this.dom.saveUniversesBtn) {
      this.dom.saveUniversesBtn.addEventListener('click', async () => {
        await this.saveLoadedUniversesToStorage();
      });
    }

    // Run merge
    this.dom.runMergeBtn.addEventListener('click', async () => {
      await this.executeSimulation();
    });

    // Results tabs
    this.dom.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // Conflicts pagination & search listeners
    if (this.dom.coordConflictsSearch) {
      let conflictDebounce;
      this.dom.coordConflictsSearch.addEventListener('input', (e) => {
        clearTimeout(conflictDebounce);
        conflictDebounce = setTimeout(() => {
          this.conflictsState.query = e.target.value.trim().toLowerCase();
          this.conflictsState.page = 1;
          this.renderConflictsView();
        }, 200);
      });
    }

    if (this.dom.coordConflictsPrevBtn) {
      this.dom.coordConflictsPrevBtn.addEventListener('click', () => {
        if (this.conflictsState.page > 1) {
          this.conflictsState.page--;
          this.renderConflictsView();
        }
      });
    }

    if (this.dom.coordConflictsNextBtn) {
      this.dom.coordConflictsNextBtn.addEventListener('click', () => {
        this.conflictsState.page++;
        this.renderConflictsView();
      });
    }

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
    this.dom.exportJsonBtn.addEventListener('click', async () => {
      await this.exportMergedJson();
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

    // Dashboard actions
    if (this.dom.dashLoadLocalBtn) {
      this.dom.dashLoadLocalBtn.addEventListener('click', async () => {
        await this.loadFromLocalIndexedDB();
      });
    }

    if (this.dom.dashProjectFileInput) {
      this.dom.dashProjectFileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          await this.importMergedJson(file);
        }
        e.target.value = '';
      });
    }

    if (this.dom.dashGoToRadarBtn) {
      this.dom.dashGoToRadarBtn.addEventListener('click', () => {
        this.switchTab('tabPlayerRadar');
      });
    }

    // Player Radar Search & Suggestions
    if (this.dom.radarPlayerSearchInput) {
      let radarDebounceTimer;
      this.dom.radarPlayerSearchInput.addEventListener('input', (e) => {
        clearTimeout(radarDebounceTimer);
        const query = e.target.value.trim();
        if (this.dom.clearRadarSearchBtn) {
          this.dom.clearRadarSearchBtn.classList.toggle('hidden', query.length === 0);
        }
        if (query.length < 2) {
          this.hideRadarSuggestions();
          return;
        }
        radarDebounceTimer = setTimeout(() => {
          this.showRadarSuggestions(query);
        }, 150);
      });

      this.dom.radarPlayerSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.hideRadarSuggestions();
          const query = this.dom.radarPlayerSearchInput.value.trim();
          if (query) {
            this.renderPlayerRadar(query);
          }
        } else if (e.key === 'Escape') {
          this.hideRadarSuggestions();
        }
      });
    }

    if (this.dom.clearRadarSearchBtn) {
      this.dom.clearRadarSearchBtn.addEventListener('click', () => {
        if (this.dom.radarPlayerSearchInput) {
          this.dom.radarPlayerSearchInput.value = '';
          this.dom.clearRadarSearchBtn.classList.add('hidden');
          this.hideRadarSuggestions();
          this.dom.radarPlayerSearchInput.focus();
        }
      });
    }

    if (this.dom.radarSearchBtn) {
      this.dom.radarSearchBtn.addEventListener('click', () => {
        const query = this.dom.radarPlayerSearchInput?.value?.trim();
        if (query) {
          this.hideRadarSuggestions();
          this.renderPlayerRadar(query);
        }
      });
    }

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (this.dom.radarPlayerSuggestions && !this.dom.radarPlayerSuggestions.contains(e.target) && e.target !== this.dom.radarPlayerSearchInput) {
        this.hideRadarSuggestions();
      }
    });

    // 15-Column System Matrix Modal listeners
    if (this.dom.closeMatrixModalBtn) {
      this.dom.closeMatrixModalBtn.addEventListener('click', () => this.closeMatrixModal());
    }
    if (this.dom.closeMatrixModalBtnBottom) {
      this.dom.closeMatrixModalBtnBottom.addEventListener('click', () => this.closeMatrixModal());
    }
    if (this.dom.systemPositionsModal) {
      this.dom.systemPositionsModal.addEventListener('click', (e) => {
        if (e.target === this.dom.systemPositionsModal) {
          this.closeMatrixModal();
        }
      });
    }

    // Modal listeners
    if (this.dom.closeSlotModalBtn) {
      this.dom.closeSlotModalBtn.addEventListener('click', () => this.closeSlotModal());
    }
    if (this.dom.closeSlotModalBtnBottom) {
      this.dom.closeSlotModalBtnBottom.addEventListener('click', () => this.closeSlotModal());
    }
    if (this.dom.slotDetailModal) {
      this.dom.slotDetailModal.addEventListener('click', (e) => {
        if (e.target === this.dom.slotDetailModal) {
          this.closeSlotModal();
        }
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.dom.systemPositionsModal && !this.dom.systemPositionsModal.classList.contains('hidden')) {
          this.closeMatrixModal();
        } else if (this.dom.slotDetailModal && !this.dom.slotDetailModal.classList.contains('hidden')) {
          this.closeSlotModal();
        }
      }
    });
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
      this.showGlobalProgress(`Descargando Universo ${community.toUpperCase()} #${uniNumber}`, 'Conectando con Gameforge API...', 10);
      const universeData = await this.apiClient.fetchUniverseData(
        community,
        uniNumber,
        role,
        async (progress) => {
          const bar = card.querySelector('.progress-bar');
          const label = card.querySelector('.uni-stats-line span');
          if (bar) bar.style.width = `${progress.percent}%`;
          if (label) label.textContent = `${progress.label} (${progress.current}/${progress.total})`;
          await this.updateGlobalProgress(
            progress.percent,
            `Descargando Universo ${community.toUpperCase()} #${uniNumber}`,
            `${progress.label} (${progress.current}/${progress.total})`
          );
        }
      );

      this.loadedUniverses.set(uniKey, universeData);
      await this.storage.saveUniverse(universeData);
      this.renderUniversesList();
      this.updateMergeActionState();
      this.ingestController.refreshSavedUniversesList();
      await this.updateGlobalProgress(100, 'Descarga Completa', `Universo ${community.toUpperCase()} #${uniNumber} guardado en memoria`);
      this.hideGlobalProgress(700);
    } catch (err) {
      this.hideGlobalProgress(200);
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
        if (this.mergedResult && this.loadedUniverses.size >= 2) {
          await this.executeSimulation();
        } else if (this.loadedUniverses.size < 2) {
          this.resetSession();
        }
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

    if (data.players && typeof data.players.values === 'function') {
      for (const player of data.players.values()) {
        player.role = newRole;
      }
    }

    if (Array.isArray(data.planets)) {
      for (const planet of data.planets) {
        planet.role = newRole;
      }
    }

    // Persist changes to IndexedDB if it contains valid entities
    if (data.players instanceof Map && data.alliances instanceof Map) {
      await this.storage.saveUniverse(data);
    }

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
    if (this.dom.saveUniversesBtn) {
      this.dom.saveUniversesBtn.disabled = readyCount === 0;
    }
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

  async saveLoadedUniversesToStorage() {
    if (this.loadedUniverses.size === 0) {
      alert('No hay universos en la lista para guardar.');
      return;
    }

    this.showGlobalProgress(
      'Guardando en Memoria Local (IndexedDB)',
      `Persistiendo ${this.loadedUniverses.size} universos en el almacenamiento del navegador...`,
      15
    );
    this.addProgressLog(`Iniciando guardado de ${this.loadedUniverses.size} universos en IndexedDB por lotes...`);

    try {
      await this.storage.saveAllUniverses(this.loadedUniverses, async (info) => {
        const pct = Math.min(90, Math.round(15 + (info.processed / info.total) * 75));
        await this.updateGlobalProgress(
          pct,
          'Guardando en IndexedDB',
          `Lote ${info.batch}/${info.totalBatches} (${info.processed}/${info.total} universos guardados)...`
        );
        this.addProgressLog(`[IndexedDB] Guardado lote ${info.batch}/${info.totalBatches} (${info.processed}/${info.total}): ${info.lastUniKey}`);
      });

      await this.updateGlobalProgress(95, 'Sincronizando Estado', 'Actualizando registros locales...');
      this.ingestController.refreshSavedUniversesList();
      this.addProgressLog(`Se guardaron exitosamente ${this.loadedUniverses.size} universos en IndexedDB.`, 'success');
      await this.updateGlobalProgress(100, 'Memoria Sincronizada', `${this.loadedUniverses.size} universos guardados con éxito`);
      this.hideGlobalProgress(700);

      alert(
        `¡Guardado exitoso!\n\n` +
        `Se han persistido ${this.loadedUniverses.size} universos en la memoria local (IndexedDB) de tu navegador.\n` +
        `Permanecerán guardados automáticamente incluso si cierras o recargas el navegador.`
      );
    } catch (err) {
      this.hideGlobalProgress(200);
      this.addProgressLog(`Error al guardar en IndexedDB: ${err.message}`, 'error');
      alert(`Error al guardar en IndexedDB: ${err.message}`);
    }
  }

  async executeSimulation() {
    if (this.loadedUniverses.size < 2) return;
    this.showGlobalProgress('Ejecutando Simulación de Fusión', 'Inicializando UniverseMergeEngine...', 15);
    this.addProgressLog(`Iniciando simulación con ${this.loadedUniverses.size} universos cargados...`);
    try {
      // Check if any loaded universe in memory has missing/hollow entities
      let needsHealing = false;
      for (const u of this.loadedUniverses.values()) {
        const pSize = u.players instanceof Map ? u.players.size : (Array.isArray(u.players) ? u.players.length : 0);
        const plLength = Array.isArray(u.planets) ? u.planets.length : 0;
        if (pSize === 0 || plLength === 0 || !(u.players instanceof Map)) {
          needsHealing = true;
          break;
        }
      }

      if (needsHealing) {
        this.addProgressLog('Sincronizando entidades con dataset maestro de recuperación...');
        await this.healUniversesFromProjectData();
      }

      // Explicitly normalize each universe before passing to UniverseMergeEngine
      this.addProgressLog('Normalizando estructuras y mapas de entidades...');
      await this.updateGlobalProgress(25, 'Preparando Universos', 'Normalizando entidades y coordenadas...');
      await this.yieldToUi(10);

      const universesArray = Array.from(this.loadedUniverses.values()).map(u => {
        let playersMap = u.players instanceof Map ? u.players : new Map();
        if (!(u.players instanceof Map) && u.players) {
          if (Array.isArray(u.players)) {
            playersMap = new Map(u.players.map(p => Array.isArray(p) ? p : [p?.id || p?.playerId, p]));
          } else if (typeof u.players === 'object' && !('size' in u.players && Object.keys(u.players).length <= 2)) {
            playersMap = new Map(Object.entries(u.players));
          }
        }

        let alliancesMap = u.alliances instanceof Map ? u.alliances : new Map();
        if (!(u.alliances instanceof Map) && u.alliances) {
          if (Array.isArray(u.alliances)) {
            alliancesMap = new Map(u.alliances.map(a => Array.isArray(a) ? a : [a?.id || a?.allianceId, a]));
          } else if (typeof u.alliances === 'object' && !('size' in u.alliances && Object.keys(u.alliances).length <= 2)) {
            alliancesMap = new Map(Object.entries(u.alliances));
          }
        }

        const planetsList = Array.isArray(u.planets) ? u.planets : [];

        return {
          ...u,
          players: playersMap,
          alliances: alliancesMap,
          planets: planetsList
        };
      });

      const totalPlanetsCount = universesArray.reduce((acc, u) => acc + u.planets.length, 0);
      const totalPlayersCount = universesArray.reduce((acc, u) => acc + u.players.size, 0);
      this.addProgressLog(`Universo multiverso preparado: ${universesArray.length} servidores, ${totalPlayersCount.toLocaleString()} jugadores, ${totalPlanetsCount.toLocaleString()} planetas.`);

      const engine = new UniverseMergeEngine(universesArray);

      const progressCallback = async (info) => {
        if (info.phase === 'Colisiones') {
          const pct = Math.min(75, Math.round(35 + (info.current / info.total) * 40));
          await this.updateGlobalProgress(
            pct,
            'Resolviendo Colisiones',
            `Reubicando por proximidad: lote ${info.chunk}/${info.totalChunks} (${info.current.toLocaleString()} / ${info.total.toLocaleString()} planetas)...`
          );
          if (info.current % 2500 === 0 || info.current === info.total) {
            this.addProgressLog(`[Colisiones] Lote ${info.chunk}/${info.totalChunks}: ${info.current.toLocaleString()} de ${info.total.toLocaleString()} planetas procesados.`);
          }
        } else if (info.phase === 'Clasificaciones') {
          const pct = Math.min(88, Math.round(75 + (info.current / info.total) * 13));
          await this.updateGlobalProgress(
            pct,
            'Recalculando Clasificaciones',
            `Clasificación (${info.current}/${info.total}): categoría ${info.category}...`
          );
          this.addProgressLog(`[Clasificaciones] Recalculada categoría: ${info.category} (${info.current}/${info.total})`);
        }
      };

      this.addProgressLog('Ejecutando algoritmo de fusión multiverso por chunks...');
      this.mergedResult = await engine.executeMerge(progressCallback);
      this.activeDataSourceLabel = `Simulación Local (${this.loadedUniverses.size} Universos)`;

      this.addProgressLog(`Fusión algorítmica finalizada. Galaxias destino: ${this.mergedResult.destination.galaxies}. Colisiones resueltas: ${this.mergedResult.conflicts.coordinates.length.toLocaleString()}.`);

      await this.updateGlobalProgress(90, 'Renderizando Vistas', 'Actualizando explorador galáctico y paneles...');
      this.populateUniverseFilterOptions();
      this.initGalaxySelectOptions(this.mergedResult.destination.galaxies);

      this.renderOverviewMetrics();
      this.renderHighscoreTable();
      this.renderGalaxySystem();
      this.renderConflictsView();
      this.renderDynamicDashboard();
      this.renderPlayerRadar();

      this.dom.resultsContainer.classList.remove('hidden');
      this.switchTab(this.activeTab || 'tabDashboard');

      this.addProgressLog('Todas las vistas y paneles actualizados.', 'success');
      await this.updateGlobalProgress(100, 'Fusión Exitosa', 'Simulación completada con éxito');
      this.hideGlobalProgress(700);
    } catch (err) {
      this.hideGlobalProgress(200);
      this.addProgressLog(`Error en el motor de fusión: ${err.message}`, 'error');
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

  getSlotPlanets(curG, curS, pos) {
    const coordKey = `${curG}:${curS}:${pos}`;
    if (!this.mergedResult || !this.mergedResult.planets) return [];

    // Fast O(1) indexed lookup if available
    if (this.mergedResult.planetsByOriginalCoord && this.mergedResult.planetsByCurrentCoord) {
      const origPlanets = this.mergedResult.planetsByOriginalCoord.get(coordKey) || [];
      const currentPlanets = this.mergedResult.planetsByCurrentCoord.get(coordKey) || [];

      if (origPlanets.length > 1) {
        return origPlanets;
      }
      if (currentPlanets.length >= 1) {
        return currentPlanets;
      }
      if (origPlanets.length === 1) {
        return origPlanets;
      }
      return [];
    }

    // All planets that originally belonged to this coordinate
    const origPlanets = this.mergedResult.planets.filter(pl => pl.originalCoords === coordKey);

    // All planets currently situated at this coordinate
    const currentPlanets = this.mergedResult.planets.filter(
      pl => (pl.coords?.raw === coordKey) || 
            (pl.coords?.g === curG && pl.coords?.s === curS && pl.coords?.p === pos)
    );

    // If 2 or more planets clashed originally at this coordinate
    if (origPlanets.length > 1) {
      // Sort: retained (winner) first, then displaced by total score descending
      return [...origPlanets].sort((a, b) => {
        if (a.retained && !b.retained) return -1;
        if (!a.retained && b.retained) return 1;
        const scoreA = this.mergedResult.players.get(a.playerId)?.scores?.total || 0;
        const scoreB = this.mergedResult.players.get(b.playerId)?.scores?.total || 0;
        return scoreB - scoreA;
      });
    }

    // If multiple planets are currently located here (e.g. edge case or imported dataset)
    if (currentPlanets.length > 1) {
      return currentPlanets;
    }

    // Single planet currently located here
    if (currentPlanets.length === 1) {
      return currentPlanets;
    }

    // Single planet originally here (if any)
    if (origPlanets.length === 1) {
      return origPlanets;
    }

    return [];
  }

  renderGalaxySystem() {
    const curG = this.galaxyState.galaxy;
    const curS = this.galaxyState.system;

    let totalOccupants = 0;
    let collisionsCount = 0;
    const slotPlanetsMap = new Map();

    for (let pos = 1; pos <= 15; pos++) {
      const planetsInSlot = this.getSlotPlanets(curG, curS, pos);
      slotPlanetsMap.set(pos, planetsInSlot);
      if (planetsInSlot.length > 0) totalOccupants++;
      if (planetsInSlot.length > 1) collisionsCount++;
    }

    const collisionText = collisionsCount > 0 
      ? ` · <span style="color: var(--accent-orange); font-weight: 700;">⚔️ ${collisionsCount} coordenada(s) con colisión</span>`
      : '';
    this.dom.galaxySysSummary.innerHTML = `Ocupación: ${totalOccupants} / 15 slots${collisionText}`;

    const frag = document.createDocumentFragment();

    for (let pos = 1; pos <= 15; pos++) {
      const planetsInSlot = slotPlanetsMap.get(pos) || [];
      const card = document.createElement('div');

      if (planetsInSlot.length === 0) {
        card.className = 'slot-card empty';
        card.innerHTML = `
          <div class="slot-header">
            <span>[${curG}:${curS}:${pos}]</span>
            <span style="color: var(--text-muted);">Vacante</span>
          </div>
          <div class="slot-planet-name" style="color: var(--text-muted);">Slot Disponible</div>
        `;
      } else if (planetsInSlot.length === 1) {
        const pl = planetsInSlot[0];
        let stateClass = '';
        if (pl.relocated) {
          stateClass = 'collision-relocated';
        } else if (pl.hasCollision && pl.retained) {
          stateClass = 'collision-retained';
        }

        card.className = `slot-card interactive ${stateClass}`;
        card.setAttribute('title', `Click para ver detalles de la coordenada [${curG}:${curS}:${pos}]`);

        card.innerHTML = `
          <div class="slot-header">
            <span style="color: var(--accent-cyan); font-weight: 700;">[${curG}:${curS}:${pos}]</span>
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              ${pl.moon ? `<span class="slot-moon-badge">🌕 Luna (${pl.moon.size}km)</span>` : ''}
              <span class="collision-action-hint">🔍 Detalle</span>
            </div>
          </div>
          ${this.renderPlanetInnerContent(pl, curG, curS, pos)}
        `;

        card.addEventListener('click', () => {
          this.openSlotModal(curG, curS, pos);
        });
      } else {
        // Multiple overlapping planets in this coordinate!
        card.className = 'slot-card slot-card-collision';
        card.setAttribute('title', `Click para ver comparativa completa de los ${planetsInSlot.length} planetas coincidentes`);

        let nestedCellsHtml = '';
        for (let i = 0; i < planetsInSlot.length; i++) {
          nestedCellsHtml += this.renderNestedPlanetSubCard(planetsInSlot[i], i + 1, planetsInSlot.length, curG, curS, pos);
        }

        card.innerHTML = `
          <div class="slot-header" style="border-bottom: 1px solid rgba(255, 157, 0, 0.25); padding-bottom: 0.35rem; margin-bottom: 0.25rem;">
            <span style="color: var(--accent-cyan); font-weight: 700;">[${curG}:${curS}:${pos}]</span>
            <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
              <span class="collision-pill-badge">⚔️ ${planetsInSlot.length} Coincidentes</span>
              <span class="collision-action-hint">🔍 Ver Comparativa</span>
            </div>
          </div>
          <div class="slot-nested-cells">
            ${nestedCellsHtml}
          </div>
        `;

        card.addEventListener('click', () => {
          this.openSlotModal(curG, curS, pos);
        });
      }

      frag.appendChild(card);
    }

    this.dom.systemSlotsGrid.innerHTML = '';
    this.dom.systemSlotsGrid.appendChild(frag);
  }

  renderNestedPlanetSubCard(pl, index, total, curG, curS, pos) {
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

    const isRetained = pl.retained;
    const borderClass = isRetained ? 'is-retained' : 'is-relocated';
    
    let resolutionBadge = '';
    if (isRetained) {
      resolutionBadge = `<span style="font-size: 0.68rem; font-weight: 700; color: var(--accent-green); background: rgba(0,255,136,0.12); padding: 0.1rem 0.35rem; border-radius: 3px; border: 1px solid rgba(0,255,136,0.3);">🛡️ Retenido [${pl.coords?.raw || `${curG}:${curS}:${pos}`}]</span>`;
    } else {
      const targetStr = pl.targetCoords || pl.coords?.raw || 'Pendiente';
      resolutionBadge = `<span style="font-size: 0.68rem; font-weight: 700; color: var(--accent-orange); background: rgba(255,157,0,0.12); padding: 0.1rem 0.35rem; border-radius: 3px; border: 1px solid rgba(255,157,0,0.3);">⚡ Reubicado ➔ [${targetStr}]</span>`;
    }

    const moonHtml = pl.moon 
      ? `<span class="slot-moon-badge" style="font-size: 0.65rem; padding: 0.08rem 0.25rem;">🌕 Luna (${pl.moon.size}km)</span>` 
      : '';

    return `
      <div class="nested-planet-card ${borderClass}">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.25rem;">
          ${resolutionBadge}
          ${moonHtml}
        </div>
        <div class="slot-planet-name" style="font-size: 0.82rem;">
          <span>🪐</span> <strong style="color: #fff;">${this.escapeHtml(pl.name)}</strong>
        </div>
        <div class="slot-player-info" style="font-size: 0.76rem;">
          <div style="display: flex; align-items: center; gap: 0.25rem; flex-wrap: wrap;">
            <span>Comandante:</span>
            <strong style="color: #fff;">${this.escapeHtml(ownerName)}</strong>
            ${statusPills}
          </div>
          <div style="font-size: 0.72rem; font-family: var(--font-mono); color: var(--text-muted); display: flex; align-items: center; margin-top: 0.1rem;">
            <span>${ownerUni}</span>
            ${speedPill}
          </div>
        </div>
        ${this.renderPlayerRanksHtml(owner)}
      </div>
    `;
  }

  renderPlanetInnerContent(pl, curG, curS, pos) {
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

    let badgeHtml = '';
    if (pl.relocated) {
      badgeHtml = `<span style="font-size: 0.68rem; color: var(--accent-orange); font-family: var(--font-mono);">⚡ Reubicado (Orig: ${pl.originalCoords})</span>`;
    } else if (pl.hasCollision && pl.retained) {
      badgeHtml = '<span style="font-size: 0.68rem; color: var(--accent-green); font-family: var(--font-mono);">🛡️ Retenido</span>';
    }

    return `
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
      ${this.renderPlayerRanksHtml(owner)}
    `;
  }

  renderPlayerRanksHtml(owner) {
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

    return `
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

  openSlotModal(curG, curS, pos) {
    if (!this.dom.slotDetailModal) return;
    const planets = this.getSlotPlanets(curG, curS, pos);
    if (!planets || planets.length === 0) return;

    const coordStr = `[${curG}:${curS}:${pos}]`;
    this.dom.modalSlotTitle.textContent = `Coordenada Galáctica ${coordStr}`;

    const isCollision = planets.length > 1;
    if (isCollision) {
      this.dom.modalSlotSubtitle.innerHTML = `<span class="text-amber-400 font-bold">⚠️ ${planets.length} Planetas Coincidentes</span> · Conflicto Resuelto en Fusión`;
    } else {
      this.dom.modalSlotSubtitle.innerHTML = `<span class="text-cyan-400 font-bold">1 Planeta Asignado</span> · Información Detallada`;
    }

    let bodyHtml = '';

    if (isCollision) {
      const winner = planets.find(p => p.retained) || planets[0];
      const winnerOwner = this.mergedResult.players.get(winner.playerId);
      const winnerName = winnerOwner?.displayName || winnerOwner?.name || 'Desconocido';
      const winnerUni = `${winner.role === 'destination' ? '★ Destino' : 'Éxodo'} ${winner.uniKey.replace('_', ' #').toUpperCase()}`;
      const reason = winner.role === 'destination' ? 'Prioridad de Servidor Anfitrión (★ Destino)' : 'Mayor Puntuación Total';

      bodyHtml += `
        <div class="bg-amber-500/10 border border-amber-500/40 p-3 rounded-md text-xs text-amber-200 leading-relaxed flex flex-col gap-1.5">
          <div class="flex items-center gap-1.5 font-bold text-amber-300">
            <span>⚠️</span> <span>Detalle de Colisión de Coordenadas:</span>
          </div>
          <div>
            ${planets.length} planetas de distintos servidores reclamaban la coordenada <strong>${coordStr}</strong>.
            La posición oficial fue <strong>retenida</strong> por <strong class="text-white">${this.escapeHtml(winnerName)}</strong> (${winnerUni}) debido a <em>${reason}</em>.
            Los planetas restantes fueron reubicados automáticamente a slots libres próximos.
          </div>
        </div>
      `;
    }

    bodyHtml += `<div class="grid grid-cols-1 ${planets.length > 1 ? 'md:grid-cols-2' : ''} gap-4">`;

    for (let i = 0; i < planets.length; i++) {
      const pl = planets[i];
      const owner = this.mergedResult.players.get(pl.playerId);
      const ownerName = owner ? (owner.displayName || owner.name) : 'Desconocido';
      const origName = owner?.originalName && owner.originalName !== owner.name ? owner.originalName : null;
      const isRetained = pl.retained;

      let allianceName = 'Sin Alianza';
      if (owner?.allianceId && this.mergedResult.alliances.has(owner.allianceId)) {
        const all = this.mergedResult.alliances.get(owner.allianceId);
        allianceName = `[${all.displayTag || all.tag}] ${all.name}`;
      }

      const roleBadge = pl.role === 'destination' 
        ? '<span class="text-cyan-400 font-bold">[★ SERVIDOR DESTINO ANFITRIÓN]</span>'
        : '<span class="text-amber-400 font-bold">[SERVIDOR ÉXODO MIGRANTE]</span>';

      const speedLight = pl.speedTrafficLight || owner?.speedTrafficLight || { badgeClass: 'badge-speed-green', label: 'x1' };

      const ranks = owner?.mergedRanks || {};
      const scores = owner?.scores || {};
      const ships = (owner?.ships || 0).toLocaleString();

      const moonInfo = pl.moon 
        ? `<div class="text-xs text-amber-400 font-mono flex items-center gap-1"><span>🌕</span> Luna Orbital: <strong>${pl.moon.size.toLocaleString()} km</strong></div>`
        : '<div class="text-xs text-slate-500 italic">Sin luna orbital</div>';

      const cardStyle = isRetained ? 'modal-card retained' : 'modal-card displaced';

      let statusPills = '';
      if (owner?.status?.includes('v')) statusPills += '<span class="player-status-tag tag-v">Modo Vacaciones</span>';
      if (owner?.status?.includes('i') || owner?.status?.includes('I')) statusPills += '<span class="player-status-tag tag-i">Inactivo</span>';
      if (owner?.collisionName) statusPills += '<span class="player-status-tag tag-collision">Nick Renombrado</span>';

      bodyHtml += `
        <div class="${cardStyle}">
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-2">
            <span class="font-bold text-xs uppercase tracking-wider ${isRetained ? 'text-emerald-400' : 'text-amber-400'}">
              ${isRetained ? '🛡️ Planeta Retenido (Ganador)' : `⚡ Planeta Reubicado ➔ [${pl.targetCoords || pl.coords?.raw}]`}
            </span>
            <span class="text-[11px] font-mono text-slate-400">Orig: ${pl.originalCoords || coordStr}</span>
          </div>

          <div class="flex flex-col gap-1">
            <div class="text-sm font-bold text-white flex items-center gap-1.5">
              <span>🪐</span> <span>${this.escapeHtml(pl.name)}</span>
            </div>
            ${moonInfo}
          </div>

          <div class="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex flex-col gap-1 text-xs">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-slate-400">Comandante:</span>
              <strong class="text-white">${this.escapeHtml(ownerName)}</strong>
              ${statusPills}
            </div>
            ${origName ? `<div class="text-[11px] text-amber-300">Nombre original en origen: <strong>${this.escapeHtml(origName)}</strong></div>` : ''}
            <div class="text-slate-400">Alianza: <strong class="text-cyan-300 font-mono">${this.escapeHtml(allianceName)}</strong></div>
            <div class="flex items-center justify-between pt-1 mt-1 border-t border-slate-800/80">
              <span class="text-[11px] font-mono">${roleBadge} ${pl.uniKey.replace('_', ' #').toUpperCase()}</span>
              <span class="badge-speed ${speedLight.badgeClass}">${speedLight.label} Flota</span>
            </div>
          </div>

          <!-- Puntuaciones y Clasificación Unificada -->
          <div class="flex flex-col gap-1 font-mono text-xs pt-1">
            <div class="flex justify-between items-center bg-slate-900/80 px-2 py-1 rounded">
              <span>🏆 <span class="text-slate-400">Total:</span> <strong>Lugar ${ranks.total ? ranks.total.toLocaleString() : '-'}</strong></span>
              <span class="text-slate-300 font-bold">${(scores.total || 0).toLocaleString()} pts</span>
            </div>
            <div class="flex justify-between items-center bg-slate-900/80 px-2 py-1 rounded">
              <span>⚔️ <span class="text-amber-400">Flota:</span> <strong class="text-amber-400">Lugar ${ranks.military ? ranks.military.toLocaleString() : '-'}</strong></span>
              <span class="text-amber-300 font-bold">${(scores.military || 0).toLocaleString()} pts (${ships} naves)</span>
            </div>
            <div class="flex justify-between items-center bg-slate-900/80 px-2 py-1 rounded">
              <span>🪙 <span class="text-amber-300">Economía:</span> <strong class="text-amber-300">Lugar ${ranks.economy ? ranks.economy.toLocaleString() : '-'}</strong></span>
              <span class="text-amber-200 font-bold">${(scores.economy || 0).toLocaleString()} pts</span>
            </div>
            <div class="flex justify-between items-center bg-slate-900/80 px-2 py-1 rounded">
              <span>🔬 <span class="text-cyan-400">Investigación:</span> <strong class="text-cyan-400">Lugar ${ranks.research ? ranks.research.toLocaleString() : '-'}</strong></span>
              <span class="text-cyan-300 font-bold">${(scores.research || 0).toLocaleString()} pts</span>
            </div>
          </div>
        </div>
      `;
    }

    bodyHtml += '</div>';

    this.dom.modalSlotBody.innerHTML = bodyHtml;
    this.dom.slotDetailModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  closeSlotModal() {
    if (!this.dom.slotDetailModal) return;
    this.dom.slotDetailModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  renderConflictsView() {
    if (!this.mergedResult || !this.mergedResult.conflicts) return;
    const coords = this.mergedResult.conflicts.coordinates || [];
    const nicks = this.mergedResult.conflicts.nicknames || [];

    // Filter coords by search query if any
    let filteredCoords = coords;
    if (this.conflictsState.query) {
      const q = this.conflictsState.query.toLowerCase();
      filteredCoords = coords.filter(c => 
        (c.originalCoords && c.originalCoords.includes(q)) ||
        (c.newCoords && c.newCoords.includes(q)) ||
        (c.planetName && c.planetName.toLowerCase().includes(q)) ||
        (c.displacedPlayer?.name && c.displacedPlayer.name.toLowerCase().includes(q)) ||
        (c.retainedPlayer?.name && c.retainedPlayer.name.toLowerCase().includes(q))
      );
    }

    const totalConflicts = filteredCoords.length;
    const startIdx = (this.conflictsState.page - 1) * this.conflictsState.pageSize;
    const endIdx = Math.min(startIdx + this.conflictsState.pageSize, totalConflicts);
    const pageRecords = filteredCoords.slice(startIdx, endIdx);

    if (this.dom.coordConflictsPaginationInfo) {
      this.dom.coordConflictsPaginationInfo.textContent = totalConflicts > 0
        ? `Mostrando ${startIdx + 1}-${endIdx} de ${totalConflicts.toLocaleString()} colisiones`
        : '0 colisiones encontradas';
    }
    if (this.dom.coordConflictsPrevBtn) {
      this.dom.coordConflictsPrevBtn.disabled = this.conflictsState.page <= 1;
    }
    if (this.dom.coordConflictsNextBtn) {
      this.dom.coordConflictsNextBtn.disabled = endIdx >= totalConflicts;
    }

    // 1. Coordinate Conflicts (Paginated)
    if (totalConflicts === 0) {
      this.dom.coordConflictsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No se detectaron colisiones de coordenadas en este conjunto de servidores.</p>';
    } else {
      const frag = document.createDocumentFragment();
      for (const c of pageRecords) {
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

  async exportMergedJson() {
    if (!this.mergedResult) return;
    this.showGlobalProgress('Exportando Simulación', 'Serializando mapa de entidades a JSON...', 35);
    await this.yieldToUi(25);
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

    await this.updateGlobalProgress(75, 'Generando Descarga', 'Comprimiendo archivo para descarga...');
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ogame_merged_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    await this.updateGlobalProgress(100, 'Descarga Iniciada', 'Archivo JSON generado.');
    this.hideGlobalProgress(700);
  }

  extractUniversesFromData(data) {
    const extracted = new Map();

    const cleanPlanet = (pl, uniKey) => {
      const rawCoords = pl.originalCoords || pl.coords?.raw || (typeof pl.coords === 'string' ? pl.coords : `${pl.coords?.g || 1}:${pl.coords?.s || 1}:${pl.coords?.p || 1}`);
      const parts = (rawCoords || '1:1:1').split(':').map(Number);
      return {
        ...pl,
        uniKey: pl.uniKey || uniKey,
        coords: { g: parts[0] || 1, s: parts[1] || 1, p: parts[2] || 1, raw: rawCoords || '1:1:1' },
        originalCoords: rawCoords || '1:1:1',
        targetCoords: rawCoords || '1:1:1'
      };
    };

    if (!data) return extracted;

    // 1. Array of universe objects or wrapper object { universes: [...] } or { loadedUniverses: [...] }
    const uniList = Array.isArray(data) ? data : (Array.isArray(data.universes) ? data.universes : (Array.isArray(data.loadedUniverses) ? data.loadedUniverses : null));
    if (uniList) {
      for (const u of uniList) {
        if (!u || (!u.uniKey && !u.uniNumber)) continue;
        const uniKey = u.uniKey || `${u.community || 'es'}_${u.uniNumber}`;
        const players = u.players instanceof Map 
          ? u.players 
          : (Array.isArray(u.players) 
              ? new Map(u.players.map(p => Array.isArray(p) ? p : [p.id, p])) 
              : new Map(Object.entries(u.players || {})));
        const alliances = u.alliances instanceof Map 
          ? u.alliances 
          : (Array.isArray(u.alliances) 
              ? new Map(u.alliances.map(a => Array.isArray(a) ? a : [a.id, a])) 
              : new Map(Object.entries(u.alliances || {})));
        const planets = (Array.isArray(u.planets) ? u.planets : []).map(p => cleanPlanet(p, uniKey));

        extracted.set(uniKey, {
          uniKey,
          community: u.community || uniKey.split('_')[0] || 'es',
          uniNumber: u.uniNumber || Number(uniKey.split('_')[1]) || 1,
          role: u.role || 'exodus',
          serverData: u.serverData || { name: `Uni ${u.uniNumber || 1}`, speedFleetWar: 1 },
          players,
          alliances,
          planets,
          endpointsLoaded: u.endpointsLoaded || { players: true, universe: true, serverData: true, alliances: true }
        });
      }
      return extracted;
    }

    // 2. Single universe object (e.g. exported from IndexedDB or Ingestion draft)
    if ((data.uniKey || (data.community && data.uniNumber)) && (data.serverData || data.players)) {
      const uniKey = data.uniKey || `${data.community || 'es'}_${data.uniNumber}`;
      const players = data.players instanceof Map 
        ? data.players 
        : (Array.isArray(data.players) 
            ? new Map(data.players.map(p => Array.isArray(p) ? p : [p.id, p])) 
            : new Map(Object.entries(data.players || {})));
      const alliances = data.alliances instanceof Map 
        ? data.alliances 
        : (Array.isArray(data.alliances) 
            ? new Map(data.alliances.map(a => Array.isArray(a) ? a : [a.id, a])) 
            : new Map(Object.entries(data.alliances || {})));
      const planets = (Array.isArray(data.planets) ? data.planets : []).map(p => cleanPlanet(p, uniKey));

      extracted.set(uniKey, {
        uniKey,
        community: data.community || uniKey.split('_')[0] || 'es',
        uniNumber: data.uniNumber || Number(uniKey.split('_')[1]) || 1,
        role: data.role || 'exodus',
        serverData: data.serverData || { name: `Uni ${data.uniNumber || 1}`, speedFleetWar: 1 },
        players,
        alliances,
        planets,
        endpointsLoaded: data.endpointsLoaded || { players: true, universe: true, serverData: true, alliances: true }
      });
      return extracted;
    }

    // 3. Full Simulation Export (ogame_simulation_latest.json or exportMergedJson output)
    if (data.destination || data.sourceUniverses || data.highscores || data.analytics) {
      if (Array.isArray(data.sourceUniverses)) {
        for (const u of data.sourceUniverses) {
          const uniKey = u.uniKey || `${u.community || 'es'}_${u.uniNumber}`;
          extracted.set(uniKey, {
            uniKey,
            community: u.community || uniKey.split('_')[0] || 'es',
            uniNumber: u.uniNumber || Number(uniKey.split('_')[1]) || 1,
            role: u.role || 'exodus',
            serverData: u.serverData || { name: `Uni ${u.uniNumber || 1}`, speedFleetWar: 1 },
            players: new Map(),
            alliances: new Map(),
            planets: [],
            endpointsLoaded: u.endpointsLoaded || { players: true, universe: true, serverData: true, alliances: true }
          });
        }
      }

      // Partition players
      let rawPlayers = [];
      if (Array.isArray(data.players)) {
        rawPlayers = data.players;
      } else if (data.players && typeof data.players === 'object') {
        rawPlayers = Object.entries(data.players);
      }
      for (const item of rawPlayers) {
        const p = Array.isArray(item) ? item[1] : item;
        const pId = p.id || p.playerId;
        const uniKey = p.uniKey || (pId && pId.includes('_') ? pId.split('_').slice(0, 2).join('_') : 'es_1');
        if (!extracted.has(uniKey)) {
          const parts = uniKey.split('_');
          extracted.set(uniKey, {
            uniKey,
            community: parts[0] || 'es',
            uniNumber: Number(parts[1]) || 1,
            role: p.role || 'exodus',
            serverData: { name: `Uni ${parts[1] || 1}`, speedFleetWar: p.speedFleetWar || 1 },
            players: new Map(),
            alliances: new Map(),
            planets: [],
            endpointsLoaded: { players: true, universe: true, serverData: true, alliances: true }
          });
        }
        extracted.get(uniKey).players.set(pId, p);
      }

      // Partition alliances
      let rawAlliances = [];
      if (Array.isArray(data.alliances)) {
        rawAlliances = data.alliances;
      } else if (data.alliances && typeof data.alliances === 'object') {
        rawAlliances = Object.entries(data.alliances);
      }
      for (const item of rawAlliances) {
        const a = Array.isArray(item) ? item[1] : item;
        const aId = a.id || a.allianceId;
        const uniKey = a.uniKey || (aId && aId.includes('_') ? aId.split('_').slice(0, 2).join('_') : null);
        if (uniKey && extracted.has(uniKey)) {
          extracted.get(uniKey).alliances.set(aId, a);
        }
      }

      // Partition planets
      if (Array.isArray(data.planets)) {
        for (const pl of data.planets) {
          const uniKey = pl.uniKey || (pl.id && pl.id.includes('_') ? pl.id.split('_').slice(0, 2).join('_') : null);
          if (uniKey && extracted.has(uniKey)) {
            extracted.get(uniKey).planets.push(cleanPlanet(pl, uniKey));
          }
        }
      }
    }

    return extracted;
  }

  async appendUniversesFromData(data, sourceName = 'Archivo JSON') {
    await this.updateGlobalProgress(55, 'Extrayendo Universos', 'Analizando entidades y servidores...');
    const extracted = this.extractUniversesFromData(data);

    if (extracted.size === 0) {
      throw new Error('El archivo no contiene universos u objetos de simulación reconocibles.');
    }

    let addedCount = 0;
    let updatedCount = 0;

    await this.updateGlobalProgress(70, 'Integrando a la Lista', `Añadiendo ${extracted.size} servidores a la memoria activa...`);

    for (const [uniKey, newUni] of extracted.entries()) {
      if (this.loadedUniverses.has(uniKey)) {
        const existing = this.loadedUniverses.get(uniKey);
        newUni.role = existing.role || newUni.role;
        this.loadedUniverses.set(uniKey, newUni);
        updatedCount++;
      } else {
        this.loadedUniverses.set(uniKey, newUni);
        addedCount++;
      }

      try {
        await this.storage.saveUniverse(newUni);
      } catch (saveErr) {
        console.warn(`No se pudo persistir ${uniKey} en IndexedDB:`, saveErr);
      }
    }

    this.renderUniversesList();
    this.updateMergeActionState();
    this.ingestController.refreshSavedUniversesList();

    if (this.loadedUniverses.size >= 2) {
      await this.updateGlobalProgress(85, 'Fusionando Universos', 'Recalculando simulación con todos los servidores...');
      await this.executeSimulation();
      this.activeDataSourceLabel = `Simulación Multiverso (${this.loadedUniverses.size} Servidores)`;
      if (this.dom.dashboardSourceStatus) {
        this.dom.dashboardSourceStatus.textContent = `Fuente Activa: ${this.activeDataSourceLabel}`;
      }
    }

    await this.updateGlobalProgress(100, 'Universos Listos', `${extracted.size} servidores sincronizados`);

    const msg = `¡Se incorporaron ${extracted.size} servidor(es) desde "${sourceName}"!\n` +
      `• Nuevos añadidos a la lista: ${addedCount}\n` +
      `• Actualizados: ${updatedCount}\n` +
      `• Total de servidores activos: ${this.loadedUniverses.size}\n\n` +
      `Ahora puedes manipularlos en la lista superior (cambiar su rol Destino/Éxodo o eliminarlos) y reejecutar la simulación con el botón de Fusión.`;
    alert(msg);
  }

  async importMergedJson(file) {
    if (!file) return;
    const mbSize = (file.size / (1024 * 1024)).toFixed(1);
    this.showGlobalProgress('Cargando Archivo Local', `Leyendo ${file.name} (${mbSize} MB)...`, 20);
    try {
      const text = await file.text();
      await this.updateGlobalProgress(45, 'Parseando JSON Masivo', `Decodificando ${mbSize} MB en memoria...`);
      const data = JSON.parse(text);
      await this.appendUniversesFromData(data, file.name);
      this.hideGlobalProgress(700);
    } catch (err) {
      this.hideGlobalProgress(200);
      alert(`Error al importar el archivo JSON: ${err.message}`);
    }
  }

  async hydrateSimulationData(data, sourceLabel = 'Archivo JSON', showAlert = false) {
    await this.updateGlobalProgress(65, 'Reconstruyendo Entidades', 'Mapeando jugadores y alianzas...');
    if (!data || (!data.highscores && !data.analytics && !data.destination)) {
      throw new Error('El archivo no tiene el formato válido de una simulación de universo de OGame.');
    }

    // 1. Reconstruct players Map
    let playersMap = new Map();
    if (Array.isArray(data.players)) {
      playersMap = new Map(data.players);
    } else if (data.players && typeof data.players === 'object') {
      playersMap = new Map(Object.entries(data.players));
    } else if (data.highscores?.total) {
      for (const p of data.highscores.total) {
        const pId = p.playerId || p.id;
        playersMap.set(pId, {
          id: pId,
          playerId: pId,
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

    // 2. Reconstruct alliances Map
    let alliancesMap = new Map();
    if (Array.isArray(data.alliances)) {
      alliancesMap = new Map(data.alliances);
    } else if (data.alliances && typeof data.alliances === 'object') {
      alliancesMap = new Map(Object.entries(data.alliances));
    }

    // 3. Reconstruct planets array
    const planets = Array.isArray(data.planets) ? data.planets : [];

    // 4. Reconstruct systemDensity Map in analytics
    const analytics = data.analytics || {};
    if (Array.isArray(analytics.systemDensity)) {
      analytics.systemDensity = new Map(analytics.systemDensity);
    } else if (analytics.systemDensity && !(analytics.systemDensity instanceof Map)) {
      analytics.systemDensity = new Map(Object.entries(analytics.systemDensity));
    } else if (!analytics.systemDensity) {
      analytics.systemDensity = new Map();
    }

    // 5. Precompute spatial lookup maps
    const planetsByOriginalCoord = new Map();
    const planetsByCurrentCoord = new Map();
    for (const pl of planets) {
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

    // 6. Set mergedResult
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
      analytics,
      planetsByOriginalCoord,
      planetsByCurrentCoord
    };

    // 6. Restore source universes as real, operable entities without clearing preloaded ones
    const extracted = this.extractUniversesFromData(data);
    for (const [key, uni] of extracted.entries()) {
      if (!this.loadedUniverses.has(key)) {
        this.loadedUniverses.set(key, uni);
      } else {
        const existing = this.loadedUniverses.get(key);
        if (!(existing.players instanceof Map) || existing.players.size === 0) {
          this.loadedUniverses.set(key, uni);
        }
      }
    }

    this.activeDataSourceLabel = sourceLabel;
    if (this.dom.dashboardSourceStatus) {
      this.dom.dashboardSourceStatus.textContent = `Fuente Activa: ${sourceLabel}`;
    }

    // 7. Update UI lists and actions
    this.renderUniversesList();
    this.updateMergeActionState();

    // 8. Refresh filter options and galaxy selectors
    this.populateUniverseFilterOptions();
    this.initGalaxySelectOptions(this.mergedResult.destination?.galaxies || 9);

    // 9. Render all views
    this.renderOverviewMetrics();
    this.renderHighscoreTable();
    this.renderGalaxySystem();
    this.renderConflictsView();
    this.renderDynamicDashboard();
    this.renderPlayerRadar();

    // Reveal results
    this.dom.resultsContainer.classList.remove('hidden');
    this.switchTab(this.activeTab || 'tabDashboard');

    if (showAlert) {
      const totalPl = this.mergedResult.players.size || (this.mergedResult.highscores?.total?.length ?? 0);
      alert(`Simulación cargada con éxito.\n• Fuente: ${sourceLabel}\n• Jugadores: ${totalPl.toLocaleString()}\n• Planetas: ${planets.length.toLocaleString()}\n• Servidores detectados: ${this.loadedUniverses.size}`);
    }
  }

  renderDynamicDashboard() {
    if (!this.mergedResult) return;
    const a = this.mergedResult.analytics || {};

    if (this.dom.dashboardSourceStatus) {
      this.dom.dashboardSourceStatus.textContent = `Fuente Activa: ${this.activeDataSourceLabel || 'Simulación en Memoria'}`;
    }

    if (this.dom.dashServerCount) {
      this.dom.dashServerCount.textContent = this.loadedUniverses.size;
    }
    if (this.dom.dashServerList) {
      const uniNames = Array.from(this.loadedUniverses.values())
        .map(u => `${u.role === 'destination' ? '★ ' : ''}U${u.uniNumber}`)
        .join(' · ');
      this.dom.dashServerList.textContent = uniNames || 'Servidores OGame';
    }

    if (this.dom.dashPlayerCount) {
      const totalPl = a.totalPlayers || this.mergedResult.players.size || 0;
      this.dom.dashPlayerCount.textContent = totalPl.toLocaleString();
    }
    if (this.dom.dashActiveRatio) {
      this.dom.dashActiveRatio.textContent = `${(a.activePlayers || 0).toLocaleString()} activos · ${(a.vacationPlayers || 0).toLocaleString()} vacaciones`;
    }

    if (this.dom.dashPlanetCount) {
      const totalPlanets = a.totalPlanets || this.mergedResult.planets.length || 0;
      this.dom.dashPlanetCount.textContent = totalPlanets.toLocaleString();
    }
    if (this.dom.dashCollisionRatio) {
      this.dom.dashCollisionRatio.textContent = `${(a.totalCollisions || 0).toLocaleString()} colisiones resueltas (${(a.totalNickCollisions || 0).toLocaleString()} nicks)`;
    }

    if (this.dom.dashTotalPoints) {
      this.dom.dashTotalPoints.textContent = `${(a.totalPoints || 0).toLocaleString()} pts`;
    }
    if (this.dom.dashFleetPoints) {
      this.dom.dashFleetPoints.textContent = `${(a.totalShips || 0).toLocaleString()} naves en flota`;
    }

    // Speeds breakdown
    const sc = a.speedCounts || { green: 0, yellow: 0, red: 0 };
    if (this.dom.dashSpeedGreenCount) {
      this.dom.dashSpeedGreenCount.textContent = `${sc.green.toLocaleString()} jug.`;
    }
    if (this.dom.dashSpeedYellowCount) {
      this.dom.dashSpeedYellowCount.textContent = `${sc.yellow.toLocaleString()} jug.`;
    }
    if (this.dom.dashSpeedRedCount) {
      this.dom.dashSpeedRedCount.textContent = `${sc.red.toLocaleString()} jug.`;
    }

    // Render list of active universes in dashboard
    if (this.dom.dashUniversesContainer) {
      this.dom.dashUniversesContainer.innerHTML = '';
      const frag = document.createDocumentFragment();

      for (const [key, u] of this.loadedUniverses.entries()) {
        const item = document.createElement('div');
        item.className = 'p-3 rounded bg-slate-900 border border-slate-800 flex justify-between items-center flex-wrap gap-2 text-xs';
        const isDest = u.role === 'destination';
        const roleBadge = isDest
          ? '<span class="text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded">[★ DESTINO / ANFITRIÓN]</span>'
          : '<span class="text-amber-400 font-bold bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded">[ÉXODO / MIGRANTE]</span>';
        
        const warSpeed = u.serverData?.speedFleetWar || u.serverData?.speedFleet || 1;
        const speedLight = UniverseMergeEngine.getSpeedTrafficLight(warSpeed);

        item.innerHTML = `
          <div class="flex items-center gap-2">
            ${roleBadge}
            <span class="font-bold text-white">${u.community ? u.community.toUpperCase() : 'ES'} #${u.uniNumber}</span>
            <span class="text-slate-400">(${u.serverData?.name || 'Universo'})</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="badge-speed ${speedLight.badgeClass}" style="font-size: 0.68rem; padding: 0.1rem 0.4rem;">
              Vel. Bélica ${speedLight.label}
            </span>
            <span class="text-slate-300 font-mono">👥 ${(u.players?.size || 0).toLocaleString()} jug.</span>
            <span class="text-slate-300 font-mono">🪐 ${(u.planets?.length || 0).toLocaleString()} plan.</span>
          </div>
        `;
        frag.appendChild(item);
      }
      this.dom.dashUniversesContainer.appendChild(frag);
    }
  }

  showRadarSuggestions(query) {
    if (!this.mergedResult || !this.mergedResult.players || !this.dom.radarPlayerSuggestions) return;
    const q = query.toLowerCase().trim();
    const matches = [];

    for (const player of this.mergedResult.players.values()) {
      const name = (player.name || '').toLowerCase();
      const orig = (player.originalName || '').toLowerCase();
      const disp = (player.displayName || '').toLowerCase();

      if (name.includes(q) || orig.includes(q) || disp.includes(q)) {
        matches.push(player);
        if (matches.length >= 10) break;
      }
    }

    if (matches.length === 0) {
      this.dom.radarPlayerSuggestions.innerHTML = '<div class="p-3 text-xs text-slate-500 italic">No se encontraron comandantes con ese término.</div>';
      this.dom.radarPlayerSuggestions.classList.remove('hidden');
      return;
    }

    this.dom.radarPlayerSuggestions.innerHTML = '';
    const frag = document.createDocumentFragment();

    for (const player of matches) {
      const item = document.createElement('div');
      item.className = 'radar-suggestion-item';
      const score = player.scores?.total ?? player.score ?? 0;
      const uniTag = (player.uniKey || '').toUpperCase().replace('_', ' ');

      item.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="font-bold text-white text-xs">${this.escapeHtml(player.displayName || player.name)}</span>
          <span class="text-[10px] text-slate-500 font-mono">[${this.escapeHtml(uniTag)}]</span>
        </div>
        <div class="text-xs font-mono text-cyan-400 font-semibold">
          ${score.toLocaleString()} pts
        </div>
      `;

      item.addEventListener('click', () => {
        this.selectRadarPlayer(player);
      });
      frag.appendChild(item);
    }

    this.dom.radarPlayerSuggestions.appendChild(frag);
    this.dom.radarPlayerSuggestions.classList.remove('hidden');
  }

  hideRadarSuggestions() {
    if (this.dom.radarPlayerSuggestions) {
      this.dom.radarPlayerSuggestions.classList.add('hidden');
    }
  }

  selectRadarPlayer(player) {
    if (!player) return;
    this.selectedRadarPlayer = player;
    this.hideRadarSuggestions();
    if (this.dom.radarPlayerSearchInput) {
      this.dom.radarPlayerSearchInput.value = player.displayName || player.name;
    }
    if (this.dom.clearRadarSearchBtn) {
      this.dom.clearRadarSearchBtn.classList.remove('hidden');
    }
    this.renderPlayerRadar(player.id);
  }

  renderPlayerRadar(targetPlayerIdOrName = null) {
    if (!this.mergedResult || !this.mergedResult.players || !this.dom.radarPlayerResultContainer) return;

    // 1. Render Top Quick Access Chips
    if (this.dom.radarQuickPlayerChips) {
      this.dom.radarQuickPlayerChips.innerHTML = '';
      const topList = (this.mergedResult.highscores?.total || []).slice(0, 7);
      const chipFrag = document.createDocumentFragment();

      for (let i = 0; i < topList.length; i++) {
        const topItem = topList[i];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'radar-chip';
        btn.innerHTML = `<span class="text-amber-400 font-bold">#${i + 1}</span> ${this.escapeHtml(topItem.name)}`;
        btn.addEventListener('click', () => {
          const targetPId = topItem.playerId || topItem.id;
          const playerObj = this.mergedResult.players.get(targetPId);
          this.selectRadarPlayer(playerObj || topItem);
        });
        chipFrag.appendChild(btn);
      }
      this.dom.radarQuickPlayerChips.appendChild(chipFrag);
    }

    // 2. Identify Target Player
    let player = null;

    if (targetPlayerIdOrName) {
      if (typeof targetPlayerIdOrName === 'string') {
        // Direct ID match
        player = this.mergedResult.players.get(targetPlayerIdOrName);
        if (!player) {
          // Name search
          const q = targetPlayerIdOrName.toLowerCase().trim();
          for (const p of this.mergedResult.players.values()) {
            const name = (p.name || '').toLowerCase();
            const disp = (p.displayName || '').toLowerCase();
            const orig = (p.originalName || '').toLowerCase();
            if (disp === q || name === q || orig === q) {
              player = p;
              break;
            }
          }
          if (!player) {
            // Partial match fallback
            for (const p of this.mergedResult.players.values()) {
              const name = (p.name || '').toLowerCase();
              const disp = (p.displayName || '').toLowerCase();
              if (disp.includes(q) || name.includes(q)) {
                player = p;
                break;
              }
            }
          }
        }
      } else if (typeof targetPlayerIdOrName === 'object') {
        player = targetPlayerIdOrName;
      }
    }

    if (!player && this.selectedRadarPlayer) {
      player = this.selectedRadarPlayer;
    }

    if (!player) {
      const topFirst = (this.mergedResult.highscores?.total || [])[0];
      if (topFirst) {
        const topFirstId = topFirst.playerId || topFirst.id;
        player = this.mergedResult.players.get(topFirstId) || topFirst;
      } else {
        player = this.mergedResult.players.values().next().value;
      }
    }

    if (!player) {
      this.dom.radarPlayerResultContainer.innerHTML = `
        <div class="p-6 rounded bg-slate-950 border border-slate-800 text-center text-slate-400 text-sm">
          No hay comandantes registrados en la simulación activa.
        </div>
      `;
      return;
    }

    this.selectedRadarPlayer = player;

    // 3. Collect Player Planets
    const targetPlayerId = player.id || player.playerId;
    const playerPlanets = this.mergedResult.planets.filter(pl => {
      return pl.playerId === targetPlayerId || (pl.originalPlayerId === (player.originalId || targetPlayerId) && pl.uniKey === player.uniKey);
    });

    // Sort planets by coordinate
    playerPlanets.sort((a, b) => {
      const gA = Number(a.coords?.g ?? (String(a.coords?.raw || '').split(':')[0] || 0));
      const sA = Number(a.coords?.s ?? (String(a.coords?.raw || '').split(':')[1] || 0));
      const pA = Number(a.coords?.p ?? (String(a.coords?.raw || '').split(':')[2] || 0));

      const gB = Number(b.coords?.g ?? (String(b.coords?.raw || '').split(':')[0] || 0));
      const sB = Number(b.coords?.s ?? (String(b.coords?.raw || '').split(':')[1] || 0));
      const pB = Number(b.coords?.p ?? (String(b.coords?.raw || '').split(':')[2] || 0));

      return (gA * 10000 + sA * 100 + pA) - (gB * 10000 + sB * 100 + pB);
    });

    // Calculate moons
    const totalMoons = playerPlanets.filter(pl => pl.moon).length;

    // Scores and ranks
    const totalScore = player.scores?.total ?? player.score ?? 0;
    const econScore = player.scores?.economy ?? 0;
    const resScore = player.scores?.research ?? 0;
    const milScore = player.scores?.military ?? 0;
    const honorScore = player.scores?.honor ?? 0;
    const shipsCount = player.ships ?? 0;

    const rankTotal = player.mergedRanks?.total ?? player.rank ?? '-';
    const deltaRank = player.deltaRanks?.total ?? 0;
    const deltaBadge = deltaRank > 0
      ? `<span class="delta-badge delta-positive">+${deltaRank}</span>`
      : (deltaRank < 0 ? `<span class="delta-badge delta-negative">${deltaRank}</span>` : '<span class="delta-badge delta-neutral">=</span>');

    const roleTag = player.role === 'destination'
      ? '<span class="text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded text-xs">[★ DESTINO]</span>'
      : '<span class="text-amber-400 font-bold bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded text-xs">[ÉXODO]</span>';

    const statusLabel = player.status === 'v' ? 'Modo Vacaciones' : (player.status === 'i' || player.status === 'I' ? 'Inactivo' : 'Activo');
    const speedLight = player.speedTrafficLight || { badgeClass: 'badge-speed-green', label: 'x1' };

    // Get alliance info
    let allianceTag = '';
    let allianceName = '';
    if (player.allianceId && this.mergedResult.alliances) {
      const ally = this.mergedResult.alliances.get(player.allianceId);
      if (ally) {
        allianceTag = ally.tag ? `[${ally.tag}]` : '';
        allianceName = ally.name || '';
      }
    }

    // 4. Render Profile and Planets
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-5';

    container.innerHTML = `
      <!-- Commander Profile Card -->
      <div class="commander-profile-card">
        <div class="flex justify-between items-start flex-wrap gap-4 pb-4 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-2xl text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              🚀
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-xl font-extrabold text-white tracking-wide">${this.escapeHtml(player.displayName || player.name)}</h3>
                ${player.originalName && player.originalName !== (player.displayName || player.name) ? `<span class="text-xs text-slate-500 font-mono">(Original: ${this.escapeHtml(player.originalName)})</span>` : ''}
                ${allianceTag ? `<span class="text-xs font-mono font-bold text-amber-400 bg-amber-950/70 border border-amber-500/30 px-2 py-0.5 rounded" title="${this.escapeHtml(allianceName)}">${this.escapeHtml(allianceTag)}</span>` : ''}
              </div>
              <div class="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                ${roleTag}
                <span class="font-mono text-cyan-400 font-semibold">Uni ${(player.uniKey || '').toUpperCase().replace('_', ' ')}</span>
                <span>·</span>
                <span class="text-slate-300 font-medium">${statusLabel}</span>
                <span>·</span>
                <span class="badge-speed ${speedLight.badgeClass}" style="font-size: 0.65rem; padding: 0.05rem 0.35rem;">Vel. Flota ${speedLight.label}</span>
              </div>
            </div>
          </div>

          <div class="text-right">
            <span class="text-xs uppercase text-slate-400 font-semibold tracking-wider">Clasificación Fusionada</span>
            <div class="flex items-center justify-end gap-2 mt-0.5">
              <span class="text-2xl font-black font-mono text-white">#${rankTotal}</span>
              ${deltaBadge}
            </div>
          </div>
        </div>

        <!-- Registered Scores HUD Matrix -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4">
          <div class="profile-stat-box">
            <span class="title">Puntuación Total</span>
            <span class="value text-cyan-400">${totalScore.toLocaleString()}</span>
          </div>
          <div class="profile-stat-box">
            <span class="title">Economía</span>
            <span class="value text-emerald-400">${econScore.toLocaleString()}</span>
          </div>
          <div class="profile-stat-box">
            <span class="title">Investigación</span>
            <span class="value text-blue-400">${resScore.toLocaleString()}</span>
          </div>
          <div class="profile-stat-box">
            <span class="title">Militar General</span>
            <span class="value text-rose-400">${milScore.toLocaleString()}</span>
          </div>
          <div class="profile-stat-box">
            <span class="title">Naves / Flota</span>
            <span class="value text-amber-400">${shipsCount.toLocaleString()}</span>
          </div>
          <div class="profile-stat-box">
            <span class="title">Puntos de Honor</span>
            <span class="value text-purple-400">${honorScore.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <!-- Planet Coordinates Table Section -->
      <div class="bg-slate-950 p-4 rounded-lg border border-slate-800 shadow-xl">
        <div class="flex justify-between items-center flex-wrap gap-2 mb-3 pb-2 border-b border-slate-800">
          <div>
            <h4 class="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>🪐</span> Coordenadas Planetarias del Comandante (${playerPlanets.length} Planetas · ${totalMoons} Lunas)
            </h4>
            <span class="text-xs text-slate-400">
              Haz clic en cualquier coordenada <strong class="text-cyan-400 font-mono">[G:S:P]</strong> para abrir la ventana con la matriz de 15 posiciones del sistema.
            </span>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 140px;">Coordenada [G:S:P]</th>
                <th>Nombre del Planeta</th>
                <th style="width: 120px;">Tipo de Astro</th>
                <th style="width: 150px;">Estado en Fusión</th>
                <th>Coordenada Origen</th>
                <th style="width: 130px; text-align: center;">Acción Táctica</th>
              </tr>
            </thead>
            <tbody id="playerPlanetsTableBody">
              <!-- Populated below -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    const tbody = container.querySelector('#playerPlanetsTableBody');
    const frag = document.createDocumentFragment();

    if (playerPlanets.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="6" class="text-center text-slate-500 py-4 italic">No se encontraron coordenadas asociadas a este comandante.</td>';
      frag.appendChild(tr);
    } else {
      for (const pl of playerPlanets) {
        const tr = document.createElement('tr');
        const rawCoords = pl.coords?.raw || pl.targetCoords || `${pl.coords?.g}:${pl.coords?.s}:${pl.coords?.p}`;
        const plG = pl.coords?.g ?? parseInt(rawCoords.split(':')[0], 10);
        const plS = pl.coords?.s ?? parseInt(rawCoords.split(':')[1], 10);
        const plP = pl.coords?.p ?? parseInt(rawCoords.split(':')[2], 10);

        const isRelocated = Boolean(pl.relocated);
        const statusBadge = isRelocated
          ? `<span class="badge-speed badge-speed-yellow text-xs px-2 py-0.5 font-bold">⚠️ Reubicado</span>`
          : `<span class="badge-speed badge-speed-green text-xs px-2 py-0.5 font-bold">✓ Conservado</span>`;

        const originCoordsText = pl.originalCoords && pl.originalCoords !== rawCoords
          ? `<span class="text-slate-400 font-mono line-through mr-1">[${pl.originalCoords}]</span> &rarr; <span class="text-amber-400 font-mono font-bold">[${rawCoords}]</span>`
          : `<span class="text-slate-400 font-mono">[${rawCoords}]</span>`;

        tr.innerHTML = `
          <td>
            <button type="button" class="btn-coord-radar" data-g="${plG}" data-s="${plS}" data-p="${plP}" data-raw="${rawCoords}" title="Abrir matriz de 15 posiciones del sistema solar">
              <span>[${rawCoords}]</span> <span>🔍</span>
            </button>
          </td>
          <td class="font-bold text-white">
            ${this.escapeHtml(pl.name)}
          </td>
          <td>
            <span class="text-xs text-slate-300 flex items-center gap-1">
              ${pl.moon ? '🪐 Planeta + 🌕 Luna' : '🪐 Planeta'}
            </span>
          </td>
          <td>${statusBadge}</td>
          <td>${originCoordsText}</td>
          <td style="text-align: center;">
            <button type="button" class="btn btn-secondary text-xs px-2.5 py-1 btn-open-matrix" data-g="${plG}" data-s="${plS}" data-p="${plP}" data-raw="${rawCoords}">
              <span>🪐</span> Ver 15 Posiciones
            </button>
          </td>
        `;

        // Coordinate click handlers
        const handleOpenMatrix = () => {
          this.openSystemPositionsModal(plG, plS, rawCoords, targetPlayerId);
        };

        tr.querySelector('.btn-coord-radar').addEventListener('click', handleOpenMatrix);
        tr.querySelector('.btn-open-matrix').addEventListener('click', handleOpenMatrix);

        frag.appendChild(tr);
      }
    }

    tbody.appendChild(frag);
    this.dom.radarPlayerResultContainer.innerHTML = '';
    this.dom.radarPlayerResultContainer.appendChild(container);
  }

  openSystemPositionsModal(galaxy, system, selectedCoord = null, targetPlayerId = null) {
    if (!this.mergedResult || !this.mergedResult.planets || !this.dom.systemPositionsModal) return;

    const g = parseInt(galaxy, 10) || 1;
    const s = parseInt(system, 10) || 1;

    // Set title and subtitle
    if (this.dom.modalMatrixTitle) {
      this.dom.modalMatrixTitle.innerHTML = `
        Sistema Solar [${g}:${s}] <span class="text-xs font-normal text-cyan-400 font-mono bg-cyan-950/70 border border-cyan-500/40 px-2 py-0.5 rounded">15 Posiciones</span>
      `;
    }

    // Filter planets for galaxy g and system s
    const systemPlanets = this.mergedResult.planets.filter(pl => {
      const plG = pl.coords?.g ?? parseInt(String(pl.coords?.raw || pl.targetCoords || '').split(':')[0], 10);
      const plS = pl.coords?.s ?? parseInt(String(pl.coords?.raw || pl.targetCoords || '').split(':')[1], 10);
      return plG === g && plS === s;
    });

    // Count occupancy and distinct commanders
    const occupiedPos = new Set();
    const uniqueCommanders = new Set();

    for (const pl of systemPlanets) {
      const plP = pl.coords?.p ?? parseInt(String(pl.coords?.raw || pl.targetCoords || '').split(':')[2], 10);
      if (plP >= 1 && plP <= 15) {
        occupiedPos.add(plP);
      }
      if (pl.playerId) {
        uniqueCommanders.add(pl.playerId);
      }
    }

    if (this.dom.matrixOccupancyBadge) {
      this.dom.matrixOccupancyBadge.textContent = `Ocupación: ${occupiedPos.size}/15 slots ocupados`;
    }
    if (this.dom.matrixTotalPlayersBadge) {
      this.dom.matrixTotalPlayersBadge.textContent = `${uniqueCommanders.size} comandantes en este sistema`;
    }

    // Build the 15-column minimalist horizontal table
    if (this.dom.matrixTableBody) {
      this.dom.matrixTableBody.innerHTML = '';
      const tr = document.createElement('tr');

      for (let pos = 1; pos <= 15; pos++) {
        const td = document.createElement('td');
        td.className = 'matrix-slot-cell';

        // Find all planets occupying position 'pos'
        const slotPlanets = systemPlanets.filter(pl => {
          const plP = pl.coords?.p ?? parseInt(String(pl.coords?.raw || pl.targetCoords || '').split(':')[2], 10);
          return plP === pos;
        });

        if (slotPlanets.length === 0) {
          td.innerHTML = `
            <div class="matrix-empty-slot">
              <span class="vacant-dash">—</span>
              <span>Vacante</span>
            </div>
          `;
        } else {
          // SORT OCCUPANTS FROM HIGHEST TO LOWEST TOTAL SCORE (Mayor a menor puntuación total)
          slotPlanets.sort((a, b) => {
            const pA = this.mergedResult.players.get(a.playerId);
            const pB = this.mergedResult.players.get(b.playerId);
            const scoreA = pA?.scores?.total ?? pA?.score ?? 0;
            const scoreB = pB?.scores?.total ?? pB?.score ?? 0;
            return scoreB - scoreA;
          });

          const stack = document.createElement('div');
          stack.className = 'matrix-occupants-stack';

          for (const planet of slotPlanets) {
            const player = this.mergedResult.players.get(planet.playerId);
            const playerName = player?.displayName || player?.name || planet.playerName || 'Comandante';
            const totalScore = player?.scores?.total ?? player?.score ?? 0;
            const uniTag = (player?.uniKey || planet.uniKey || '').toUpperCase().replace('_', ' ');

            const isSearched = Boolean(
              (targetPlayerId && planet.playerId === targetPlayerId) ||
              (selectedCoord && (planet.coords?.raw === selectedCoord || planet.targetCoords === selectedCoord))
            );
            const isRetained = !planet.relocated;

            const card = document.createElement('div');
            card.className = `matrix-occupant-card ${isRetained ? 'is-retained' : 'is-relocated'} ${isSearched ? 'highlight-target-player' : ''}`;

            card.innerHTML = `
              <div class="occupant-header">
                <span class="occupant-name" title="${this.escapeHtml(playerName)}">
                  ${isSearched ? '⭐ ' : ''}${this.escapeHtml(playerName)}
                </span>
                <span class="occupant-uni-tag">[${this.escapeHtml(uniTag)}]</span>
              </div>
              <div class="occupant-score">
                ${totalScore.toLocaleString()} <span class="score-unit">pts</span>
              </div>
              <div class="occupant-planet-meta" title="${this.escapeHtml(planet.name)}">
                <span>${planet.moon ? '🪐+🌕' : '🪐'}</span>
                <span class="truncate">${this.escapeHtml(planet.name)}</span>
              </div>
              <span class="occupant-status-tag ${isRetained ? 'tag-retained' : 'tag-relocated'}">
                ${isRetained ? 'Titular' : 'Reubicado'}
              </span>
            `;

            // Clicking an occupant switches radar to that player!
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
              if (player) {
                this.closeMatrixModal();
                this.selectRadarPlayer(player);
                this.switchTab('tabPlayerRadar');
              }
            });

            stack.appendChild(card);
          }

          td.appendChild(stack);
        }

        tr.appendChild(td);
      }

      this.dom.matrixTableBody.appendChild(tr);
    }

    // Display modal
    this.dom.systemPositionsModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  closeMatrixModal() {
    if (!this.dom.systemPositionsModal) return;
    this.dom.systemPositionsModal.classList.add('hidden');
    document.body.style.overflow = '';
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
