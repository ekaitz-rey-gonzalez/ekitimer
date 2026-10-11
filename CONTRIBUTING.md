# Cómo colaborar

¡Gracias por querer mejorar EKITIMER! Cualquier ayuda es bienvenida: avisar de errores, proponer ideas o enviar código.

## Avisar de un error o proponer una idea

Abre un [issue](../../issues) y cuenta:

- qué hiciste, qué esperabas y qué pasó;
- el navegador y el dispositivo;
- si es posible, el scramble o los tiempos con los que ocurre.

## Enviar cambios

1. Haz un fork y crea una rama: `git checkout -b mi-mejora`.
2. Instala las dependencias de desarrollo: `npm install`.
3. Arranca la app con `npm start` y ábrela en http://localhost:4173.
4. Antes de enviar, pasa las pruebas:
   ```bash
   npm test
   npx playwright install chromium   # solo la primera vez
   npm run test:e2e
   ```
5. Abre un pull request explicando el cambio.

## Pautas

- **Sin dependencias en tiempo de ejecución ni paso de compilación:** la app debe seguir funcionando abriendo `index.html`.
- La lógica sin interfaz va en `js/puzzles.js` o `js/core.js`, con pruebas en `tests/unit/`. Lo que toque la interfaz va en `js/app.js` y se prueba en `tests/e2e/`.
- Las reglas de competición siguen el [Reglamento de la WCA](https://www.worldcubeassociation.org/regulations/). Si cambias un cálculo, añade una prueba con un caso real.
- Textos de la interfaz en español, claros y cortos.
- Si cambias archivos que usa el service worker, sube `VERSION` en `sw.js` y `APP_VERSION` en `js/app.js`.

Al contribuir aceptas que tu código se publique bajo la licencia [GPL-3.0](LICENSE).
