# Newton in movimento / Newton in Motion

Sito educativo interattivo, bilingue (IT/EN) e statico sulle tre leggi del moto di Isaac Newton: la storia della loro formulazione e tre simulazioni che mostrano il concetto dietro le formule.

- **Pubblico**: studenti 13–18 anni, insegnanti, curiosi.
- **Percorso di ogni legge**: Predici → Sperimenta → Spiega → Verifica.
- **Accessibilità**: WCAG 2.2 AA, uso completo da tastiera, descrizioni testuali delle simulazioni aggiornate in tempo reale (`aria-live`), tabelle dati alternative ai grafici, rispetto di `prefers-reduced-motion`, tema chiaro/scuro con contrasti verificati.
- **Nessun backend, nessun tracking, nessun cookie, nessuna richiesta di rete esterna.** Funziona offline dopo la prima visita (Service Worker).

Specifica completa: [`docs/SPEC.md`](docs/SPEC.md). Decisioni di progetto: [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Pagine
| File | Contenuto |
|---|---|
| `index.html` | Home |
| `storia.html` | Linea del tempo con badge Documentato / Tradizione / Dibattito |
| `legge-1.html` | Inerzia — "Il carrello sul ghiaccio" |
| `legge-2.html` | F = m·a — "Spingi il carrello" (tabella esperimenti, "Scopri la regola", "Sfida") |
| `legge-3.html` | Azione e reazione — "Pattini e razzo" |
| `quiz.html` | Quiz finale con feedback formativo |
| `fonti.html` | Fonti e licenze |

## Eseguire in locale
I moduli ES e `fetch` dei dizionari richiedono un server HTTP (non `file://`):

```sh
python3 -m http.server 8000
# apri http://localhost:8000/
```

Nessuna installazione, nessun build obbligatorio.

## Controlli e test
Tutti eseguibili con Node 22, senza dipendenze:

```sh
node tools/check-placeholders.js   # nessun [[DA VERIFICARE]] nel sito
node tools/check-i18n.js           # chiavi it/en allineate e tutte definite
node tools/build.js --check        # HTML allineato a partials/ e it.json
node tools/check-links.js          # link interni e ancore (--external per gli URL esterni)
node tools/contrast-check.js       # contrasti WCAG dei token, tema chiaro e scuro
node --test tests/physics.test.js  # criteri di accuratezza fisica (SPEC 8.5)
```

I test fisici girano anche nel browser: `tests/physics.test.html`.
Facoltativi, con Playwright: `tests/smoke.mjs` (errori console e richieste esterne) e `tests/a11y.mjs` (audit axe-core). Checklist manuale: [`docs/TESTING.md`](docs/TESTING.md).

## Come è fatto
- HTML5, CSS3, JavaScript ES2022 a moduli nativi. Zero framework, zero bundler, zero librerie.
- `assets/js/sim/engine.js`: integrazione a passo fisso (1/120 s) con accumulatore, indipendente dal frame rate; pausa automatica a scheda nascosta.
- Fisica pura e testabile in `assets/js/sim/sim-*.js`, separata dal disegno (`assets/js/pages/*.js`).
- Testi in `assets/i18n/it.json` e `en.json`. `tools/build.js` (facoltativo) rigenera header/footer condivisi, i blocchi ripetitivi e il testo italiano di fallback nell'HTML, così le pagine si leggono anche senza JavaScript.

## Modificare i testi o aggiungere una lingua
1. Modifica `assets/i18n/it.json` e `assets/i18n/en.json` (stesse chiavi; mini-markup: `**grassetto**`, `*corsivo*`, `[testo](url)`).
2. Esegui `node tools/build.js` per aggiornare il fallback nell'HTML, poi `node tools/check-i18n.js`.
3. Per una nuova lingua: aggiungi `assets/i18n/<codice>.json`, il codice in `SUPPORTED` (`assets/js/i18n.js`) e una `<option>` in `partials/header.html`.

**Contenuti storici**: solo fatti verificati (SPEC sez. 6). Un fatto nuovo va prima in `docs/TODO-VERIFICA.md`; nel testo si usa il segnaposto `[[DA VERIFICARE]]`, che fa fallire la CI finché non viene risolto.

## Pubblicazione
Il workflow `.github/workflows/pages.yml` esegue i controlli a ogni push e pull request e, su `main`, pubblica su GitHub Pages. Una tantum: **Settings → Pages → Source: GitHub Actions**. URL previsto: <https://monaripietro.github.io/leggiDiNewton/>.

## Licenze
Codice: vedi [LICENSE](LICENSE). Testi: CC BY 4.0. Font: SIL OFL 1.1. Dettagli in [CREDITS.md](CREDITS.md).
