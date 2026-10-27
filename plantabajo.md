Actúa como un Desarrollador Web Senior y Arquitecto Frontend experto en aplicaciones client-side, manipulación de APIs públicas XML y simulaciones lógicas.

### OBJETIVO
Construir una Single-Page Application (SPA) web estática (Vanilla JavaScript ES6+, HTML5 semántico y CSS moderno / Tailwind CSS vía CDN) que consuma las APIs públicas XML de OGame, permita seleccionar dos o más universos/servidores, y ejecute una simulación en memoria del lado del cliente (Client-side) de una migración y fusión (merging) hacia un servidor destino unificado.

---

### RESTRICCIONES TÉCNICAS Y DE ARQUITECTURA
1. **Zero-Backend & Zero-Database:** Todo el procesamiento, cálculo de colisiones y recálculo de puntuaciones debe ocurrir 100% en el navegador (`DOMParser`, `Web Workers` o promesas asíncronas para datasets grandes).
2. **Persistencia Local Opcional:** Usar `IndexedDB` o `localStorage` únicamente como caché temporal para evitar peticiones redundantes a las APIs durante la sesión.
3. **Manejo de CORS / APIs OGame:** Las APIs oficiales de OGame exponen datos en XML (e.g., `https://s{uni}-{lang}.ogame.gameforge.com/api/...`). Debido a políticas de CORS del navegador, incluye un selector/fallback para configurar proxies inversos de desarrollo (`corsproxy.io`, `allorigins.win` o un proxy personal configurable por el usuario).
4. **Dependencias:** Vanilla JS o librerías ligeras sin bundlers complejos. Utiliza CSS moderno (Tailwind CDN o CSS custom con diseño espacial/sci-fi estilo OGame: oscuro, acentos cian/naranja, tipografía monoespaciada para datos).

---

### ENDPOINTS XML DE OGAME REQUERIDOS (Por cada universo seleccionado)
- `serverData.xml`: Configuración del universo (velocidad de flota, galaxias, sistemas, reglas).
- `players.xml`: ID, nick, alianza, estado (vacaciones, inactivo, etc.).
- `alliances.xml`: Lista de alianzas e integrantes.
- `universe.xml`: Localización de todos los planetas y lunas (coordenadas: `[G:S:P]`, ID de jugador, tamaño, etc.).
- `highscore.xml`: Puntuaciones por categorías (Total, Economía, Flota, Investigación, Militares Construidos/Perdidos/Destruidos, Honor).

---

### MÓDULOS Y FUNCIONALIDADES CLAVE

#### 1. Panel de Selección y Carga de Universos
- Capacidad de ingresar la URL base o seleccionar comunidad y número de universo (ej. Comunidad `es`, Universos `190` y `195`).
- Barra de progreso/estado de fetch y parseo XML por cada servidor cargado.
- Normalización de entidades para evitar solapamientos de IDs primarios entre universos (asignar un prefijo temporal tipo `u1_playerID`).

#### 2. Motor de Simulación de Migración y Fusión
Al fusionar 2 o más universos en uno "Virtual/Destino", implementar la lógica de resolución de conflictos:
- **Colisiones de Coordenadas Planetarias `[G:S:P]`:**
  - Si dos planetas de distintos universos ocupan exactamente la misma coordenada, aplicar lógica de reubicación: el jugador con mayor antigüedad o puntuación retiene la posición original; el planeta desplazado se marca como "En conflicto / Requiere Reubicación gratuita" y se calcula automáticamente la posición vacía más cercana dentro del mismo sistema o rango solar.
- **Colisiones de Nicks y Tags de Alianza:**
  - Detección de nombres duplicados, agregando sufijos automáticos sugeridos (ej. `PlayerName_U1`).
- **Recálculo de Tablas de Posiciones (Highscores):**
  - Fusión y ordenamiento descendente de las puntuaciones de todos los jugadores migrantes en todas las categorías (`Total`, `Economía`, `Investigación`, `Militar`).
  - Comparativa de impacto: columna con variación de puesto estimado (`Delta Rank`: e.g. "Era Top 5 en Uni 1 -> Ahora Top 24 en Uni Fusionado").

#### 3. Interfaz de Usuario y Vistas Analíticas
- **Dashboard de Clasificación Unificada:** Tabla interactiva con búsqueda por jugador/alianza, filtrado por universo de origen, paginación y ordenamiento por columnas.
- **Explorador / Mapa Galáctico de Densidad:**
  - Vista interactiva por Galaxia/Sistema que muestre la ocupación de planetas y lunas antes y después de la fusión.
  - Alerta visual destacada en rojo/ámbar para sistemas o slots con colisiones directas.
- **Comparador y Estadísticas Globales:**
  - Tarjetas resumen con métricas clave: Total de jugadores activos fusionados, total de flotas/puntos en circulación, porcentaje de ocupación galáctica.

---

### ENTREGABLE REQUERIDO
Genera el código modular y completo listo para desplegar:
1. `index.html`: Estructura semántica, panel de control, vistas tabulares y mapas.
2. `styles.css`: Tema visual dark mode inspirado en interfaz de mando espacial.
3. `ogameApi.js`: Clases/módulos para fetch, parseo XML a objetos JSON y cache.
4. `mergeEngine.js`: Algoritmos de deduplicación, resolución de coordenadas y re-ranking.
5. `app.js`: Lógica de UI, renderizado y reactividad de eventos.