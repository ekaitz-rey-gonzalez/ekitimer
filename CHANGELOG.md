# Novedades

Todos los cambios importantes de EKITIMER. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen [SemVer](https://semver.org/lang/es/).

## [1.0.0] — 2026-10-11

Primera versión pública.

### Añadido
- **Modo competición:** rondas con el formato oficial de cada evento (Ao5, Mo3, Bo3), inspección WCA obligatoria, objetivo, corte y límite de tiempo. Muestra la mejor y peor media posibles, el tiempo necesario en el último intento y guarda un historial de rondas.
- **Datos:** copia de seguridad y restauración sin duplicados, importación desde csTimer, Twisty Timer y Cubic Timer, y avisos si el navegador no puede guardar.
- **App instalable** que funciona sin conexión (manifiesto y service worker).
- Pantalla siempre encendida, duración de inspección configurable, tamaño del scramble ajustable.
- Selección múltiple para mover o borrar tiempos y mover un tiempo desde su detalle.
- Simulación real de Megaminx y vista de Square-1 con colores laterales al estilo TNoodle.
- Scrambles de estado aleatorio con cubing.js y generador local de respaldo.
- Las 17 categorías WCA, con BLD, FMC y Multi-BLD.
- Deshacer (`Ctrl+Z`) para cualquier borrado o cambio.
- Exportación a Excel con columnas numéricas y hoja de rondas.
- Pruebas automáticas (Node y Playwright) y publicación continua en GitHub Pages.
