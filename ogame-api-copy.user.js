// ==UserScript==
// @name         OGame API XML Fast Copier & Downloader
// @namespace    https://github.com/astac-dev/migraGame
// @version      1.0.0
// @description  Agrega un botón flotante en páginas XML de OGame para copiar todo el contenido al portapapeles o descargarlo con un solo clic.
// @author       astac-dev
// @match        *://*.ogame.gameforge.com/api/*
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  function extractXmlSource() {
    try {
      // 1. Serializar el documento XML completo si el navegador cargó el DOM nativo
      if (document.documentElement) {
        const serializer = new XMLSerializer();
        const xml = serializer.serializeToString(document);
        if (xml && xml.trim().length > 10) {
          return xml;
        }
      }

      // 2. Fallback si el navegador lo renderizó dentro de una etiqueta <pre>
      const pre = document.querySelector('pre');
      if (pre && pre.textContent.trim()) {
        return pre.textContent;
      }

      // 3. Fallback genérico a outerHTML
      return document.documentElement ? document.documentElement.outerHTML : document.body.innerText;
    } catch (e) {
      return document.body ? document.body.innerText : '';
    }
  }

  function getFileNameFromUrl() {
    try {
      const url = new URL(window.location.href);
      const pathname = url.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1) || 'data.xml';
      const cleanName = filename.split('?')[0];
      return cleanName.endsWith('.xml') ? cleanName : `${cleanName}.xml`;
    } catch (e) {
      return 'ogame_api.xml';
    }
  }

  function createFloatingToolbar() {
    // Evitar inyecciones duplicadas
    if (document.getElementById('ogame-copy-toolbar')) return;

    const bar = document.createElement('div');
    bar.id = 'ogame-copy-toolbar';
    bar.style.cssText = `
      position: fixed;
      top: 14px;
      right: 14px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #0f172a;
      border: 1px solid #38bdf8;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif;
      font-size: 13px;
    `;

    // Botón Copiar
    const copyBtn = document.createElement('button');
    copyBtn.innerHTML = '📋 <strong>Copiar XML</strong>';
    copyBtn.style.cssText = `
      background: #00f0ff;
      color: #050b14;
      border: none;
      padding: 6px 14px;
      border-radius: 5px;
      font-weight: 700;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 5px;
    `;

    // Botón Descargar
    const downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = '💾 Descargar';
    downloadBtn.style.cssText = `
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #475569;
      padding: 6px 12px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
    `;

    // Evento Copiar
    copyBtn.addEventListener('click', () => {
      const xml = extractXmlSource();
      if (!xml || xml.trim().length === 0) {
        alert('No se pudo extraer el contenido XML.');
        return;
      }

      const performCopy = () => {
        copyBtn.innerHTML = '✔ <strong>¡Copiado!</strong>';
        copyBtn.style.background = '#22c55e';
        copyBtn.style.color = '#ffffff';

        setTimeout(() => {
          copyBtn.innerHTML = '📋 <strong>Copiar XML</strong>';
          copyBtn.style.background = '#00f0ff';
          copyBtn.style.color = '#050b14';
        }, 2200);
      };

      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(xml);
        performCopy();
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(xml)
          .then(performCopy)
          .catch(() => {
            prompt('Copia manualmente este contenido:', xml.slice(0, 200) + '...');
          });
      }
    });

    // Evento Descargar
    downloadBtn.addEventListener('click', () => {
      const xml = extractXmlSource();
      const fileName = getFileNameFromUrl();
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    });

    bar.appendChild(copyBtn);
    bar.appendChild(downloadBtn);
    document.body.appendChild(bar);
  }

  // Esperar a que el DOM esté disponible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingToolbar);
  } else {
    createFloatingToolbar();
  }
})();
