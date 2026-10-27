/**
 * UI Ingestion Controller (Bypass CORS Module)
 * Allows users to fetch XML directly in their browser to bypass Cloudflare 403 blocks,
 * then ingest via Drag & Drop or Clipboard / Paste with DOMParser validation.
 * Auto-saves incrementally to IndexedDB on every paste/drop event to survive browser crashes.
 */

import { XmlParser } from './xmlParser.js';

export class UiIngestController {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container
   * @param {UniverseStorage} options.storage
   * @param {Function} options.onUniverseReady - Callback when a universe is successfully ingested and saved
   * @param {Function} options.onUniverseDeleted - Callback when a universe is removed
   */
  constructor(options) {
    this.container = options.container;
    this.storage = options.storage;
    this.onUniverseReady = options.onUniverseReady || (() => {});
    this.onUniverseDeleted = options.onUniverseDeleted || (() => {});

    this.parser = new XmlParser();

    // Ingest state for currently selected target universe
    this.currentCommunity = 'es';
    this.currentUniNumber = 280;
    this.currentRole = 'destination'; // 'destination' | 'exodus'

    this.resetDraftState();

    this.render();
    this.bindEvents();
    this.loadDraftForCurrentTarget().then(() => {
      this.refreshSavedUniversesList();
    });
  }

  resetDraftState() {
    this.draftData = {
      serverData: null,
      players: null,
      alliances: null,
      planets: null,
      highscores: {
        total: false,
        economy: false,
        research: false,
        military: false
      }
    };
    this.draftStats = {
      playersCount: 0,
      alliancesCount: 0,
      planetsCount: 0,
      scoresCount: 0
    };
    this.endpointsTimestamp = {};
    this.lastSavedTimestamp = null;
  }

  getUniKey() {
    return `${this.currentCommunity.toLowerCase().trim()}_${String(this.currentUniNumber).trim()}`;
  }

  getBaseUrl() {
    return `https://s${this.currentUniNumber}-${this.currentCommunity}.ogame.gameforge.com/api`;
  }

  async loadDraftForCurrentTarget() {
    const uniKey = this.getUniKey();
    try {
      const draft = await this.storage.getDraft(uniKey);
      if (draft) {
        this.draftData = {
          serverData: draft.serverData || null,
          players: draft.players || null,
          alliances: draft.alliances || null,
          planets: draft.planets || null,
          highscores: draft.highscores || {
            total: false,
            economy: false,
            research: false,
            military: false
          }
        };

        this.draftStats = {
          playersCount: this.draftData.players ? this.draftData.players.size : 0,
          alliancesCount: this.draftData.alliances ? this.draftData.alliances.size : 0,
          planetsCount: this.draftData.planets ? this.draftData.planets.length : 0,
          scoresCount: 0
        };

        this.endpointsTimestamp = draft.endpointsTimestamp || {};
        this.lastSavedTimestamp = draft.updatedAt || null;
      } else {
        this.resetDraftState();
      }
      this.renderEndpointsCards();
    } catch (err) {
      console.warn('Could not load draft from storage:', err);
    }
  }

  async persistCurrentDraft() {
    const uniKey = this.getUniKey();
    const draftPayload = {
      community: this.currentCommunity,
      uniNumber: this.currentUniNumber,
      role: this.currentRole,
      serverData: this.draftData.serverData,
      alliances: this.draftData.alliances,
      players: this.draftData.players,
      planets: this.draftData.planets,
      highscores: this.draftData.highscores,
      endpointsTimestamp: this.endpointsTimestamp
    };

    try {
      await this.storage.saveDraft(uniKey, draftPayload);
      this.lastSavedTimestamp = Date.now();
      this.updateDraftHeaderInfo();
    } catch (err) {
      console.error('Error auto-guardando borrador:', err);
    }
  }

  formatTimestamp(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }

  getEndpointsConfig() {
    const base = this.getBaseUrl();
    return [
      {
        id: 'serverData',
        title: 'serverData.xml',
        desc: 'Configuración de galaxias, sistemas y velocidad',
        expectedRoot: 'serverData',
        url: `${base}/serverData.xml`,
        isReady: !!this.draftData.serverData,
        summary: this.draftData.serverData ? `Vel: x${this.draftData.serverData.speed} · Gal: ${this.draftData.serverData.galaxies}` : null,
        timestamp: this.endpointsTimestamp['serverData']
      },
      {
        id: 'players',
        title: 'players.xml',
        desc: 'Lista de jugadores, estados (v/i) y afiliaciones',
        expectedRoot: 'players',
        url: `${base}/players.xml`,
        isReady: !!this.draftData.players,
        summary: this.draftData.players ? `${this.draftStats.playersCount.toLocaleString()} jugadores cargados` : null,
        timestamp: this.endpointsTimestamp['players']
      },
      {
        id: 'alliances',
        title: 'alliances.xml',
        desc: 'Lista de alianzas y etiquetas (tags)',
        expectedRoot: 'alliances',
        url: `${base}/alliances.xml`,
        isReady: !!this.draftData.alliances,
        summary: this.draftData.alliances ? `${this.draftStats.alliancesCount.toLocaleString()} alianzas cargadas` : null,
        timestamp: this.endpointsTimestamp['alliances']
      },
      {
        id: 'universe',
        title: 'universe.xml',
        desc: 'Coordenadas [G:S:P] de todos los planetas y lunas',
        expectedRoot: 'universe',
        url: `${base}/universe.xml`,
        isReady: !!this.draftData.planets,
        summary: this.draftData.planets ? `${this.draftStats.planetsCount.toLocaleString()} planetas procesados` : null,
        timestamp: this.endpointsTimestamp['universe']
      },
      {
        id: 'highscore_total',
        title: 'highscore.xml (Total)',
        desc: 'Puntuación Total General (?category=1&type=0)',
        expectedRoot: 'highscore',
        url: `${base}/highscore.xml?category=1&type=0`,
        isReady: this.draftData.highscores.total,
        summary: this.draftData.highscores.total ? 'Puntuaciones aplicadas' : null,
        timestamp: this.endpointsTimestamp['highscore_total']
      },
      {
        id: 'highscore_eco',
        title: 'highscore.xml (Economía)',
        desc: 'Puntuación de Economía (?category=1&type=1)',
        expectedRoot: 'highscore',
        url: `${base}/highscore.xml?category=1&type=1`,
        isReady: this.draftData.highscores.economy,
        summary: this.draftData.highscores.economy ? 'Economía aplicada' : null,
        timestamp: this.endpointsTimestamp['highscore_eco']
      },
      {
        id: 'highscore_res',
        title: 'highscore.xml (Investigación)',
        desc: 'Puntuación de Investigación (?category=1&type=2)',
        expectedRoot: 'highscore',
        url: `${base}/highscore.xml?category=1&type=2`,
        isReady: this.draftData.highscores.research,
        summary: this.draftData.highscores.research ? 'Investigación aplicada' : null,
        timestamp: this.endpointsTimestamp['highscore_res']
      },
      {
        id: 'highscore_mil',
        title: 'highscore.xml (Militar)',
        desc: 'Puntuación Militar y Naves (?category=1&type=3)',
        expectedRoot: 'highscore',
        url: `${base}/highscore.xml?category=1&type=3`,
        isReady: this.draftData.highscores.military,
        summary: this.draftData.highscores.military ? 'Militar aplicado' : null,
        timestamp: this.endpointsTimestamp['highscore_mil']
      }
    ];
  }

  render() {
    this.container.innerHTML = `
      <div class="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl text-slate-200">
        <!-- Header & Target Selector -->
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-3">
          <div>
            <h2 class="text-base font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>🛡️</span> Ingesta Desacoplada Anti-CORS (Bypass Cloudflare)
            </h2>
            <p class="text-xs text-slate-400 mt-1">
              Abre los XML directamente en tu navegador para evitar bloqueos HTTP 403. Al pegar o subir cada archivo se auto-guarda localmente en tiempo real.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate-400 font-semibold uppercase">Comunidad:</label>
              <input type="text" id="ingestCommInput" value="${this.currentCommunity}" class="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-sm w-16 text-center font-mono">
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate-400 font-semibold uppercase">Nº Universo:</label>
              <input type="number" id="ingestUniInput" value="${this.currentUniNumber}" class="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-sm w-20 text-center font-mono">
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate-400 font-semibold uppercase">Rol:</label>
              <select id="ingestRoleSelect" class="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-sm font-semibold">
                <option value="destination" ${this.currentRole === 'destination' ? 'selected' : ''}>★ Destino (Anfitrión)</option>
                <option value="exodus" ${this.currentRole === 'exodus' ? 'selected' : ''}>Éxodo (Migrante)</option>
              </select>
            </div>
            <button id="updateIngestTargetBtn" class="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-1 rounded text-xs transition">
              Actualizar URLs
            </button>
          </div>
        </div>

        <!-- Real-Time Auto-Save Banner -->
        <div id="draftAutoSaveBanner" class="bg-slate-950/70 border border-slate-800 rounded px-3 py-2 mb-4 flex justify-between items-center text-xs">
          <div class="flex items-center gap-2 text-slate-300">
            <span class="text-emerald-400">💾</span>
            <span id="draftStatusText">Auto-guardado activo: no perderás tus avances en caso de recarga o caída.</span>
          </div>
          <div id="draftLastSavedText" class="font-mono text-cyan-400 text-[11px]">
            Sin datos guardados aún
          </div>
        </div>

        <!-- Endpoints Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6" id="endpointsGridContainer">
          <!-- Rendered dynamically -->
        </div>

        <!-- Actions & Confirmation Bar -->
        <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800 bg-slate-950/60 p-3 rounded">
          <div class="text-xs text-slate-400 flex items-center gap-4" id="ingestStatusSummary">
            <span>Progreso del Servidor:</span>
            <span class="font-mono text-cyan-400 font-bold" id="ingestProgressCounter">0 / 8 completados</span>
          </div>

          <div class="flex items-center gap-2">
            <button id="saveUniverseToDbBtn" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <span>💾</span> Confirmar e Incorporar Universo al Simulador
            </button>
            <button id="resetDraftBtn" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded transition">
              Limpiar Borrador
            </button>
          </div>
        </div>

        <!-- Saved Universes in IndexedDB Panel -->
        <div class="mt-6 pt-4 border-t border-slate-800">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>🗄️</span> Universos Finalizados en IndexedDB
            </h3>
            <button id="clearAllDbBtn" class="text-xs text-red-400 hover:text-red-300 underline">
              Vaciar Todo IndexedDB
            </button>
          </div>
          <div id="savedUniversesList" class="flex flex-wrap gap-2 text-xs">
            <span class="text-slate-500 italic">Cargando base de datos local...</span>
          </div>
        </div>
      </div>
    `;

    this.renderEndpointsCards();
  }

  updateDraftHeaderInfo() {
    const bannerText = this.container.querySelector('#draftLastSavedText');
    if (bannerText) {
      if (this.lastSavedTimestamp) {
        bannerText.textContent = `Último auto-guardado: ${this.formatTimestamp(this.lastSavedTimestamp)}`;
      } else {
        bannerText.textContent = 'Sin datos guardados aún';
      }
    }
  }

  renderEndpointsCards() {
    const grid = this.container.querySelector('#endpointsGridContainer');
    if (!grid) return;

    const endpoints = this.getEndpointsConfig();
    let readyCount = 0;

    grid.innerHTML = endpoints.map(ep => {
      if (ep.isReady) readyCount++;

      const statusBadge = ep.isReady
        ? `<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1">✔ Listo</span>`
        : `<span class="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] px-2 py-0.5 rounded-full font-mono">Pendiente</span>`;

      const timeFormatted = ep.timestamp ? this.formatTimestamp(ep.timestamp) : null;

      return `
        <div class="bg-slate-950/80 border ${ep.isReady ? 'border-emerald-500/30' : 'border-slate-800'} rounded-md p-3 flex flex-col justify-between gap-3 text-xs" data-ep-id="${ep.id}">
          <div>
            <div class="flex justify-between items-start gap-2 mb-1">
              <div>
                <strong class="text-white font-mono text-sm">${ep.title}</strong>
                <p class="text-slate-400 text-[11px]">${ep.desc}</p>
              </div>
              <div>${statusBadge}</div>
            </div>

            <div class="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-400 font-mono truncate my-1.5">
              ${ep.url}
            </div>

            <!-- Quick Action Links -->
            <div class="flex items-center gap-2 mt-2">
              <a href="${ep.url}" target="_blank" rel="noopener noreferrer" class="bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 px-2.5 py-1 rounded text-[11px] transition inline-flex items-center gap-1">
                <span>↗</span> Abrir en pestaña nueva
              </a>
              <button type="button" class="copy-url-btn bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded text-[11px] transition inline-flex items-center gap-1" data-url="${ep.url}">
                <span>📋</span> Copiar URL
              </button>
            </div>
          </div>

          <!-- Ingestion Dropzone & Paste Section -->
          <div class="border-t border-slate-800/80 pt-2 flex flex-col gap-2">
            <div class="flex justify-between items-center">
              ${ep.summary ? `<span class="text-[11px] text-emerald-400 font-mono">✔ ${ep.summary}</span>` : '<span class="text-[11px] text-slate-500">Esperando datos...</span>'}
              ${timeFormatted ? `<span class="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">🕒 Cargado: ${timeFormatted}</span>` : ''}
            </div>

            <div class="flex gap-2">
              <button type="button" class="paste-clip-btn bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/50 px-2.5 py-1 rounded text-[11px] transition flex-1 font-semibold" data-ep-id="${ep.id}" data-root="${ep.expectedRoot}">
                📄 Pegar desde Portapapeles
              </button>
              <label class="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded text-[11px] cursor-pointer transition text-center font-semibold">
                📁 Subir .XML
                <input type="file" accept=".xml" class="hidden file-input" data-ep-id="${ep.id}" data-root="${ep.expectedRoot}">
              </label>
              <button type="button" class="toggle-manual-text-btn bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded text-[11px]" data-ep-id="${ep.id}" title="Alternar entrada de texto manual">
                ✏️
              </button>
            </div>

            <!-- Collapsible manual textarea -->
            <div class="manual-textarea-container hidden flex-col gap-1.5 mt-1" id="manual_box_${ep.id}">
              <textarea placeholder="Pega el contenido XML aquí..." class="w-full bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-mono p-1.5 rounded h-16 resize-y focus:outline-none focus:border-cyan-500"></textarea>
              <button type="button" class="apply-manual-text-btn bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-0.5 rounded text-[10px]" data-ep-id="${ep.id}" data-root="${ep.expectedRoot}">
                Validar y Procesar Texto
              </button>
            </div>

            <div class="error-msg-box hidden text-[11px] text-red-400 font-mono bg-red-950/40 p-1.5 rounded border border-red-800/50"></div>
          </div>
        </div>
      `;
    }).join('');

    const counter = this.container.querySelector('#ingestProgressCounter');
    if (counter) counter.textContent = `${readyCount} / ${endpoints.length} completados`;

    this.updateDraftHeaderInfo();

    const saveBtn = this.container.querySelector('#saveUniverseToDbBtn');
    if (saveBtn) {
      saveBtn.disabled = !this.draftData.players || !this.draftData.serverData || !this.draftData.planets;
    }
  }

  bindEvents() {
    this.container.addEventListener('click', async (e) => {
      // Update target
      if (e.target.id === 'updateIngestTargetBtn') {
        const comm = this.container.querySelector('#ingestCommInput').value.trim().toLowerCase();
        const uniNum = parseInt(this.container.querySelector('#ingestUniInput').value.trim(), 10);
        const role = this.container.querySelector('#ingestRoleSelect').value;

        if (comm && uniNum) {
          this.currentCommunity = comm;
          this.currentUniNumber = uniNum;
          this.currentRole = role;
          await this.loadDraftForCurrentTarget();
        }
      }

      // Copy URL
      const copyBtn = e.target.closest('.copy-url-btn');
      if (copyBtn) {
        const url = copyBtn.dataset.url;
        navigator.clipboard.writeText(url).then(() => {
          const original = copyBtn.innerHTML;
          copyBtn.innerHTML = '<span>✔</span> ¡Copiado!';
          setTimeout(() => { copyBtn.innerHTML = original; }, 2000);
        });
      }

      // Toggle manual textarea
      const toggleBtn = e.target.closest('.toggle-manual-text-btn');
      if (toggleBtn) {
        const epId = toggleBtn.dataset.epId;
        const box = this.container.querySelector(`#manual_box_${epId}`);
        if (box) box.classList.toggle('hidden');
      }

      // Apply manual text button
      const applyBtn = e.target.closest('.apply-manual-text-btn');
      if (applyBtn) {
        const epId = applyBtn.dataset.epId;
        const root = applyBtn.dataset.root;
        const box = this.container.querySelector(`#manual_box_${epId}`);
        const text = box.querySelector('textarea').value;
        await this.processXmlInput(epId, root, text);
      }

      // Paste from clipboard button
      const pasteBtn = e.target.closest('.paste-clip-btn');
      if (pasteBtn) {
        const epId = pasteBtn.dataset.epId;
        const root = pasteBtn.dataset.root;
        navigator.clipboard.readText()
          .then(async (clipText) => {
            if (!clipText || !clipText.trim()) {
              alert('El portapapeles está vacío.');
              return;
            }
            await this.processXmlInput(epId, root, clipText);
          })
          .catch(() => {
            const box = this.container.querySelector(`#manual_box_${epId}`);
            if (box) {
              box.classList.remove('hidden');
              box.querySelector('textarea').focus();
            }
            alert('Permiso de portapapeles denegado. Pega el texto directamente en el recuadro desplegado.');
          });
      }

      // Save Universe
      if (e.target.id === 'saveUniverseToDbBtn') {
        await this.finalizeAndSaveUniverse();
      }

      // Reset Draft
      if (e.target.id === 'resetDraftBtn') {
        if (confirm('¿Deseas descartar el borrador actual guardado para este servidor?')) {
          const uniKey = this.getUniKey();
          await this.storage.deleteDraft(uniKey);
          this.resetDraftState();
          this.renderEndpointsCards();
        }
      }

      // Clear all DB
      if (e.target.id === 'clearAllDbBtn') {
        if (confirm('¿Vaciar todos los universos y borradores almacenados en IndexedDB?')) {
          await this.storage.clearAll();
          this.resetDraftState();
          this.renderEndpointsCards();
          this.refreshSavedUniversesList();
          this.onUniverseDeleted('all');
        }
      }
    });

    // File input changes
    this.container.addEventListener('change', async (e) => {
      const fileInput = e.target.closest('.file-input');
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const epId = fileInput.dataset.epId;
        const root = fileInput.dataset.root;
        try {
          const text = await XmlParser.readFileAsText(file);
          await this.processXmlInput(epId, root, text);
        } catch (err) {
          this.showEndpointError(epId, err.message);
        }
      }
    });

    // Drag and Drop support
    this.container.addEventListener('dragover', (e) => {
      const card = e.target.closest('[data-ep-id]');
      if (card) {
        e.preventDefault();
        card.classList.add('border-cyan-400');
      }
    });

    this.container.addEventListener('dragleave', (e) => {
      const card = e.target.closest('[data-ep-id]');
      if (card) {
        card.classList.remove('border-cyan-400');
      }
    });

    this.container.addEventListener('drop', async (e) => {
      const card = e.target.closest('[data-ep-id]');
      if (card) {
        e.preventDefault();
        card.classList.remove('border-cyan-400');
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files[0]) {
          const file = dt.files[0];
          const epId = card.dataset.epId;
          const root = card.querySelector('.file-input')?.dataset.root;
          try {
            const text = await XmlParser.readFileAsText(file);
            await this.processXmlInput(epId, root, text);
          } catch (err) {
            this.showEndpointError(epId, err.message);
          }
        }
      }
    });
  }

  async processXmlInput(epId, expectedRoot, xmlString) {
    const uniKey = this.getUniKey();

    try {
      this.clearEndpointError(epId);

      // 1. Validation of XML and root tag
      const xmlDoc = this.parser.validateAndParse(xmlString, expectedRoot);

      // 2. Dispatch parsing based on endpoint
      if (epId === 'serverData') {
        this.draftData.serverData = this.parser.parseServerData(xmlDoc, this.currentCommunity, this.currentUniNumber, this.currentRole);
      } else if (epId === 'players') {
        this.draftData.players = this.parser.parsePlayers(xmlDoc, uniKey, this.currentRole);
        this.draftStats.playersCount = this.draftData.players.size;
      } else if (epId === 'alliances') {
        this.draftData.alliances = this.parser.parseAlliances(xmlDoc, uniKey);
        this.draftStats.alliancesCount = this.draftData.alliances.size;
      } else if (epId === 'universe') {
        const playersRef = this.draftData.players || new Map();
        this.draftData.planets = await this.parser.parseUniversePlanets(
          xmlDoc,
          uniKey,
          this.currentRole,
          playersRef
        );
        this.draftStats.planetsCount = this.draftData.planets.length;
      } else if (epId.startsWith('highscore_')) {
        const catKey = epId.replace('highscore_', '');
        const targetCategory = catKey === 'eco' ? 'economy' : (catKey === 'res' ? 'research' : (catKey === 'mil' ? 'military' : 'total'));

        const playersRef = this.draftData.players || new Map();
        const appliedCount = this.parser.applyHighscore(xmlDoc, playersRef, targetCategory);
        this.draftData.highscores[targetCategory] = true;
        this.draftStats.scoresCount += appliedCount;
      }

      // 3. Record timestamp for this endpoint
      this.endpointsTimestamp[epId] = Date.now();

      // 4. Auto-save draft incrementally to IndexedDB
      await this.persistCurrentDraft();

      // 5. Update UI
      this.renderEndpointsCards();
    } catch (err) {
      this.showEndpointError(epId, err.message);
    }
  }

  showEndpointError(epId, message) {
    const card = this.container.querySelector(`[data-ep-id="${epId}"]`);
    if (card) {
      const errBox = card.querySelector('.error-msg-box');
      if (errBox) {
        errBox.textContent = `❌ ${message}`;
        errBox.classList.remove('hidden');
      }
    }
  }

  clearEndpointError(epId) {
    const card = this.container.querySelector(`[data-ep-id="${epId}"]`);
    if (card) {
      const errBox = card.querySelector('.error-msg-box');
      if (errBox) {
        errBox.textContent = '';
        errBox.classList.add('hidden');
      }
    }
  }

  async finalizeAndSaveUniverse() {
    const uniKey = this.getUniKey();

    if (!this.draftData.players || !this.draftData.serverData || !this.draftData.planets) {
      alert('Debes cargar al menos players.xml, universe.xml y serverData.xml antes de incorporar el universo.');
      return;
    }

    const payload = {
      uniKey,
      community: this.currentCommunity,
      uniNumber: this.currentUniNumber,
      role: this.currentRole,
      serverData: this.draftData.serverData,
      alliances: this.draftData.alliances || new Map(),
      players: this.draftData.players,
      planets: this.draftData.planets
    };

    try {
      await this.storage.saveUniverse(payload);
      // Remove draft since it has been finalized
      await this.storage.deleteDraft(uniKey);

      alert(`¡Universo ${payload.community.toUpperCase()} #${payload.uniNumber} guardado en IndexedDB con éxito!`);
      this.refreshSavedUniversesList();
      this.onUniverseReady(payload);
    } catch (err) {
      alert(`Error al guardar en IndexedDB: ${err.message}`);
    }
  }

  async refreshSavedUniversesList() {
    const listContainer = this.container.querySelector('#savedUniversesList');
    if (!listContainer) return;

    try {
      const saved = await this.storage.getAllUniverses();
      if (saved.length === 0) {
        listContainer.innerHTML = '<span class="text-slate-500 italic">No hay universos finalizados aún en IndexedDB.</span>';
        return;
      }

      listContainer.innerHTML = saved.map(u => {
        const roleBadge = u.role === 'destination' 
          ? '<span class="text-cyan-400 font-bold">[★ Destino]</span>'
          : '<span class="text-amber-400 font-bold">[Éxodo]</span>';

        const dateStr = u.savedAt ? this.formatTimestamp(u.savedAt) : 'Desconocida';

        return `
          <div class="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 flex items-center gap-2">
            <span>${roleBadge} ${u.community.toUpperCase()} #${u.uniNumber} (${u.serverData?.name || 'Uni'})</span>
            <span class="text-slate-400 font-mono text-[11px]">${u.players.size.toLocaleString()} jug. · ${u.planets.length.toLocaleString()} plan.</span>
            <span class="text-slate-500 font-mono text-[10px]">(${dateStr})</span>
            <button class="delete-saved-uni-btn text-red-400 hover:text-red-300 ml-1" data-unikey="${u.uniKey}">✖</button>
          </div>
        `;
      }).join('');

      listContainer.querySelectorAll('.delete-saved-uni-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const key = btn.dataset.unikey;
          if (confirm(`¿Eliminar universo ${key} de IndexedDB?`)) {
            await this.storage.deleteUniverse(key);
            this.refreshSavedUniversesList();
            this.onUniverseDeleted(key);
          }
        });
      });
    } catch (err) {
      listContainer.innerHTML = `<span class="text-red-400">Error: ${err.message}</span>`;
    }
  }
}
