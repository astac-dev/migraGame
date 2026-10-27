# OGame Universe Merger (Zero-Backend)

Simulador client-side de migración y fusión (merging) de universos de OGame desarrollado con arquitectura Vanilla JavaScript (ES Modules), HTML5 semántico y CSS moderno, diseñado para ejecución directa en GitHub Pages.

## Arquitectura y Características

- **Zero-Backend & Zero-Database:** Todo el consumo de APIs XML, resolución de colisiones y recálculo de puntuaciones ocurre 100% en el navegador (`DOMParser`, promesas asíncronas y chunks para evitar bloqueos del Event Loop).
- **APIs Oficiales OGame:** Consumo dinámico de `serverData.xml`, `players.xml`, `alliances.xml`, `universe.xml` y `highscore.xml` (categorías Total, Economía, Investigación y Militar).
- **Soporte CORS Proxies:** Selector configurable en tiempo real (`corsproxy.io`, `allorigins.win`, `codetabs.com` o proxy personalizado).
- **Motor de Fusión (`UniverseMergeEngine`):**
  - **Detección y Resolución de Colisiones de Coordenadas `[G:S:P]`:** El jugador con mayor puntuación conserva la posición original. El planeta desplazado se reubica automáticamente al slot vacante más cercano (mismo sistema o galaxia). Las lunas se desplazan conjuntamente con su planeta.
  - **Deduplicación de Nombres y Tags:** Detección de duplicados y asignación de sufijos `_U{servidor}` preservando el nick original para el jugador de mayor antigüedad/puntuación.
  - **Recálculo de Highscores y Delta Rank:** Ordenamiento descendente unificado con cálculo de variación de posición relativa.
- **Explorador Galáctico:** Vista interactiva de las 15 posiciones por galaxia/sistema con identificación de estados (Normal, Retenido, Reubicado) y presencia de lunas.
- **Exportación:** Descarga del dataset final unificado en formato JSON.

## Estructura del Proyecto

```text
├── index.html          # Interfaz SPA y vistas de control
├── css/
│   └── styles.css      # Hoja de estilos Sci-Fi Dark Mode
├── js/
│   ├── ogameApi.js     # Cliente unificado de APIs XML OGame
│   ├── mergeEngine.js  # Motor de fusión, colisiones y re-ranking
│   └── app.js          # Controlador UI y reactividad
├── plantabajo.md       # Especificación del plan de trabajo
├── reglas.md           # Restricciones técnicas del sistema
└── README.md           # Documentación técnica
```

## Despliegue en GitHub Pages

1. Activa GitHub Pages en el repositorio desde `Settings > Pages`.
2. Selecciona la rama `main` y la carpeta `/ (root)`.
3. Guarda los cambios. La aplicación se ejecutará de forma autónoma sin necesidad de pasos de compilación ni dependencias de Node.js.
