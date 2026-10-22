# Test

## Automatici (eseguiti in CI a ogni push)
| Controllo | Comando | Esito al rilascio iniziale |
|---|---|---|
| Segnaposto `[[DA VERIFICARE]]` assenti | `node tools/check-placeholders.js` | ok |
| Chiavi i18n IT/EN allineate e definite | `node tools/check-i18n.js` | ok |
| HTML allineato a `partials/` e `it.json` | `node tools/build.js --check` | ok |
| Link interni e ancore | `node tools/check-links.js` | ok |
| Contrasti dei token (chiaro e scuro) | `node tools/contrast-check.js` | ok, tutte le coppie ≥ soglia |
| Elenco file del Service Worker | `node tools/check-sw.js` | ok |
| Fisica (SPEC 8.5) | `node --test tests/physics.test.js` | 7/7 ok |

Criteri fisici coperti: velocità costante con μ = 0 per 60 s (|Δv| < 1e-9); arresto alla distanza v0²/(2μg); a = 5,00 ± 0,01 m/s² con F = 10 N e m = 2 kg; attrito statico; conservazione della quantità di moto (pattinatori e razzo, < 1e-6 relativo); stesso stato a 30, 60 e 144 Hz.

## Automatici facoltativi (Playwright, Chromium)
| Controllo | Comando | Esito al rilascio iniziale |
|---|---|---|
| Errori console, HTTP, richieste esterne (7 pagine × chiaro/scuro) | `node tests/smoke.mjs` | 0 errori, 0 richieste esterne |
| axe-core 4.10, WCAG 2.2 A/AA + best practice (7 pagine × chiaro/scuro × 1280/320 px) | `node tests/a11y.mjs URL axe.min.js` | 0 violazioni; nessuno scroll orizzontale a 320 px |
| Lighthouse 12 (desktop headless) | — | Performance 99–100, Accessibility 100, Best practices 100, SEO 100 |
| Peso pagine | Lighthouse `total-byte-weight` | 197 KB (home) – 266 KB (Legge 2), sotto i 300 KB |

Nota: axe non può verificare il contenuto disegnato nei canvas. I colori dei vettori sono token verificati da `contrast-check.js` (≥ 3:1 sulla superficie) e i vettori sono distinguibili anche per forma (piena / tratteggiata / puntinata) ed etichetta.

## Verifiche funzionali eseguite (Playwright)
- [x] Il primo elemento focalizzabile è "Salta al contenuto".
- [x] Previsione: conferma → confronto bloccato (`aria-disabled`) finché non si usa la simulazione → feedback specifico.
- [x] Cambio lingua senza ricaricare: `lang`, titolo, testi, descrizione viva e letture aggiornati; la simulazione continua dallo stesso stato.
- [x] Lingua e tema persistono dopo il ricaricamento (localStorage con try/catch).
- [x] Cursori: frecce ±1, Maiusc+freccia ±5 N; `aria-valuetext` con unità.
- [x] `prefers-reduced-motion`: la Legge 2 parte in pausa e mostra l'avviso; pulsanti "Avvia" e "Passo avanti" disponibili.
- [x] Menu mobile (360 px): apertura, chiusura con Esc, ritorno del focus al pulsante.
- [x] Filtro della linea del tempo con conteggio annunciato.
- [x] Test fisici anche nel browser: `tests/physics.test.html`.
- [x] Simulazioni funzionanti senza `ctx.roundRect` (browser meno recenti, alternativa con `arcTo`).
- [x] Legge 2: un clic fuori dalla freccia non cambia la forza; trascinando la freccia la forza cambia. 10 pressioni rapide sul cursore producono 1 annuncio.
- [x] Previsione bloccata dopo l'uso della simulazione.
- [x] Dizionario non raggiungibile: la lingua resta quella attuale e viene annunciato l'errore.
- [x] Legge 3: "Avvia" fa partire la spinta e, a fine pista, riparte da capo.

## Checklist manuale (da completare prima di ogni rilascio)
- [ ] **Screen reader**: un percorso completo con NVDA (Windows) o VoiceOver (macOS/iOS): Home → Storia → Legge 1 (previsione, simulazione, mini-verifica). *Non eseguito nell'ambiente di sviluppo.*
- [ ] **Tastiera**: tutte le pagine solo con Tab/Maiusc+Tab/Invio/Spazio/frecce; focus sempre visibile.
- [ ] **Zoom 200%** e testo ingrandito nelle impostazioni del browser: nessuna perdita di contenuto.
- [ ] **Mobile reale** (Android Chrome, iOS Safari): touch sui controlli e trascinamento della freccia della forza (Legge 2).
- [ ] **Reduced motion** attivato dal sistema operativo.
- [ ] **Offline**: visita il sito, disattiva la rete, ricarica e naviga tra le pagine.
- [ ] **Firefox, Safari, Edge**: nessun errore in console, simulazioni funzionanti (usano solo API standard: Canvas 2D, `roundRect`, `IntersectionObserver`, `ResizeObserver`, top-level await).
- [ ] Verifica storica: ogni frase della pagina Storia corrisponde a una riga della SPEC sez. 6 (vedi `docs/DECISIONS.md` per le esclusioni).
