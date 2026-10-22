# SPEC.md — "Newton in Movimento" / "Newton in Motion"
Sito educativo interattivo, multilingua (IT/EN), serverless, per le tre leggi di Newton.
Documento per agente di coding (Mistral Vibe, modalità code). Versione 1.0

---

## 0. Come usare questo documento (istruzioni all'agente)

1. Leggi tutto il documento prima di scrivere codice.
2. Lavora per **milestone** (sez. 14). Dopo ogni milestone: esegui i controlli di accettazione, fai `git commit` con messaggio convenzionale, poi fermati e riassumi in 5 righe.
3. Non aggiungere funzionalità, dipendenze o framework non previsti. In caso di ambiguità, scegli la soluzione più semplice e annota la decisione in `docs/DECISIONS.md`.
4. **Contenuti storici**: usa SOLO i fatti della sez. 6 (marcati VERIFICATO). Non inventare date, citazioni o aneddoti. Cio' che è marcato LEGGENDA va presentato come tale. Cio' che è marcato DA VERIFICARE NON va inserito finché l'utente non conferma.
5. Nessun backend, nessun build step obbligatorio, nessun tracking, nessun cookie, nessuna chiamata di rete a runtime (tranne eventuali font self-hosted: vietato CDN).
6. Codice leggibile, commentato dove la fisica non è ovvia. ES modules nativi, niente transpiler.

## 1. Obiettivo e pubblico

- **Obiettivo**: far scoprire le tre leggi di Newton attraverso la storia della loro formulazione e simulazioni che mostrano il *concetto* dietro le formule (non solo il calcolo).
- **Pubblico**: studenti 13–18 anni, insegnanti, curiosi adulti. Nessuna conoscenza di fisica richiesta.
- **Criteri di successo**: (a) un utente capisce, dopo ogni simulazione, una frase-chiave in linguaggio semplice; (b) usabile solo da tastiera; (c) Lighthouse Accessibility ≥ 95, Performance ≥ 90 in Chrome; (d) deploy automatico su GitHub Pages.

## 2. Vincoli tecnici (non negoziabili)

| Area | Requisito |
|---|---|
| Stack | HTML5, CSS3, JavaScript ES2022 (moduli nativi). Zero framework, zero bundler. |
| Hosting | Statico, GitHub Pages (branch `main`, cartella root o `/docs`, oppure GitHub Actions `pages`). |
| Browser | Ottimizzato per Google Chrome (ultime 2 versioni stabili). Deve degradare con grazia su Firefox/Safari/Edge (nessuna API Chrome-only senza fallback). |
| Rete | Funziona offline dopo il primo caricamento (Service Worker opzionale, milestone 8). Nessuna dipendenza esterna a runtime. |
| Percorsi | **Solo percorsi relativi** (il sito vive in `/<nome-repo>/`). Niente `/` iniziale negli URL. |
| Routing | Hash routing (`#/storia`, `#/legge-1`…) oppure pagine HTML separate. Scelta: **pagine HTML separate** per URL condivisibili e SEO, con header/footer condivisi via JS (`<template>` + fetch locale) o duplicati con script di build facoltativo. |
| Storage | `localStorage` ammesso solo per lingua e tema (con try/catch). Nessun dato personale. |
| Licenze | Codice MIT. Contenuti testuali CC BY 4.0. Immagini solo pubblico dominio o creati da noi (SVG). Elencare in `CREDITS.md`. |
| Peso | Pagina iniziale < 300 KB trasferiti. Nessuna immagine raster > 150 KB. |

## 3. Struttura repository

```
newton-in-movimento/
├─ index.html                 # Home
├─ storia.html                # Timeline storica
├─ legge-1.html               # Inerzia
├─ legge-2.html               # F = m·a
├─ legge-3.html               # Azione-reazione
├─ quiz.html                  # Verifica finale (facoltativa, M7)
├─ fonti.html                 # Fonti e bibliografia
├─ assets/
│  ├─ css/ tokens.css base.css components.css pages.css
│  ├─ js/
│  │  ├─ i18n.js  nav.js  theme.js  a11y.js
│  │  ├─ sim/ engine.js  vec.js  canvas-utils.js
│  │  │       sim-inertia.js  sim-force.js  sim-reaction.js
│  │  └─ timeline.js
│  ├─ i18n/ it.json  en.json
│  ├─ img/  (SVG originali)
│  └─ fonts/ (self-hosted, woff2)
├─ docs/ SPEC.md  DECISIONS.md  TESTING.md
├─ .github/workflows/pages.yml
├─ CREDITS.md  LICENSE  README.md  .nojekyll
```

## 4. Design

### 4.1 Linguaggio visivo
Moderno, calmo, arioso. Colori pastello **con contrasto testuale AA garantito** (testo scuro su sfondi pastello; mai testo pastello su pastello).

Palette (token CSS, tema chiaro):

| Token | Valore | Uso |
|---|---|---|
| `--bg` | `#FBFAF7` | sfondo pagina |
| `--surface` | `#FFFFFF` | card |
| `--ink` | `#1F2A37` | testo (contrasto > 12:1 su bg) |
| `--ink-soft` | `#4B5563` | testo secondario (≥ 7:1) |
| `--mint` | `#CDEFE3` | Legge 1 |
| `--peach` | `#FFD9C4` | Legge 2 |
| `--lavender` | `#DCD3F5` | Legge 3 |
| `--sky` | `#CFE6FA` | storia / neutro |
| `--lemon` | `#FFF1B8` | evidenziazioni |
| `--accent` | `#2F6F8F` | link, focus, pulsanti primari (≥ 4.5:1 con bianco) |

Tema scuro (`prefers-color-scheme: dark` + toggle): sfondo `#14181F`, testo `#E8EDF3`, pastelli desaturati e scuriti; verificare contrasti.
**Regola**: ogni coppia testo/sfondo va verificata ≥ 4.5:1 (testo normale) o 3:1 (testo grande e componenti UI). Aggiungere script `tools/contrast-check.html` o test manuale documentato.

### 4.2 Tipografia
Font self-hosted woff2 (es. Atkinson Hyperlegible per il corpo — pensato per la leggibilità — e un display sans/serif a scelta con licenza OFL). `font-display: swap`. Corpo ≥ 18px, interlinea 1.6, larghezza riga 65–75ch. Scala fluida con `clamp()`.

### 4.3 Layout e componenti
- Mobile-first, breakpoint 480/768/1100. Griglia CSS, `gap` su scala 4px.
- Angoli arrotondati moderati (8–16px), ombre morbide, nessun gradiente appariscente.
- Componenti: header con nav + selettore lingua + toggle tema; card di legge colorata; callout "Idea chiave"; callout "Attenzione: leggenda/dibattito"; pannello controlli simulazione; timeline verticale; footer con fonti.
- Una **icona/colore per legge** coerente in tutto il sito, ma l'informazione non deve mai dipendere solo dal colore.

### 4.4 Movimento
Animazioni sobrie. Rispettare `prefers-reduced-motion`: le simulazioni partono in pausa, con pulsante "Avvia" e modalità passo-passo; transizioni UI ridotte a dissolvenze.

## 5. Accessibilità (WCAG 2.2 AA) — requisito di prima classe

- HTML semantico (`header, nav, main, section, article, footer`), un solo `h1` per pagina, gerarchia titoli corretta, `lang` dinamico su `<html>`.
- "Salta al contenuto" come primo elemento focalizzabile.
- Tutto operabile da tastiera; focus visibile (outline ≥ 3px, contrasto ≥ 3:1); target tattili ≥ 44×44px.
- **Simulazioni**: ogni `<canvas>` ha `role="img"` + `aria-label` descrittivo e un **equivalente testuale vivo** (`aria-live="polite"`, aggiornato con throttling ~1/s e a eventi chiave: "la palla si ferma", "la forza raddoppia, l'accelerazione raddoppia"). Controlli = elementi nativi (`input type=range`, `button`) con `<label>`; slider con `aria-valuetext` che include l'unità.
- Ogni simulazione ha: Pausa/Riprendi, Reset, Passo-passo, e tabella dati alternativa (aprire/chiudere con `<details>`).
- Nessun contenuto lampeggiante > 3 lampi/sec. Nessun limite di tempo.
- Informazione non solo col colore (forme, etichette, frecce con testo). Vettori etichettati ("F", "a", "v").
- Testo ridimensionabile al 200% senza perdita; layout ok a 320px.
- Alternativa testuale per ogni immagine; immagini decorative `alt=""`.
- Link con testo significativo; link esterni indicati.
- Check: axe DevTools, Lighthouse, test con tastiera, test con NVDA o VoiceOver (almeno un percorso completo), zoom 200%.

## 6. Contenuto storico (verificato)

Principio editoriale: **distinguere fatto, tradizione, interpretazione**. Ogni scheda storica mostra un badge: `Documentato` / `Tradizione` / `Dibattito`, e rimanda a una fonte in `fonti.html`.

### 6.1 Timeline — fatti da usare

| Quando | Fatto | Stato |
|---|---|---|
| 1642 (stile gregoriano; 25 dic 1642 secondo il calendario giuliano allora in uso in Inghilterra, 4 gen 1643 secondo il gregoriano) | Nascita di Isaac Newton a Woolsthorpe, Lincolnshire. | Documentato (spiegare la doppia datazione in una nota) |
| 1665–1667 | La peste costringe a chiudere Cambridge; Newton trascorre periodi a Woolsthorpe Manor (due soggiorni prolungati tra estate 1665 e primavera 1667), anni detti "annus mirabilis" / anni dei miracoli. | Documentato |
| c. 1666 | Aneddoto della mela: raccontato da Newton anziano a William Stukeley (1726), che lo riporta nelle sue memorie. Il National Trust lo definisce una leggenda scientifica ritenuta in larga parte vera. Non è documentato che la mela abbia "colpito" Newton in testa (**questo dettaglio va escluso o dichiarato falso/tardivo**). | Tradizione |
| Prima di Newton | Il principio d'inerzia fu formulato per il moto orizzontale da Galileo e poi generalizzato da Descartes; Newton lo inserì come prima legge. Mostrare questo per evitare il mito del "Newton inventa tutto da solo". | Documentato |
| Agosto 1684 | Edmond Halley visita Newton a Cambridge e gli chiede quale curva descriverebbe un pianeta sotto una forza inversamente proporzionale al quadrato della distanza; Newton risponde "un'ellisse" e dice di averlo calcolato (ma non ritrova subito i calcoli). | Documentato (data esatta del mese: fonti indicano agosto 1684) |
| Novembre 1684 | Newton invia a Halley il trattato di 9 pagine *De motu corporum in gyrum* ("Sul moto dei corpi in orbita"). | Documentato |
| 10 dicembre 1684 | Halley riferisce alla Royal Society di aver visto il trattato; viene incoraggiata la pubblicazione. | Documentato |
| 1685–1686 | Circa 18 mesi di lavoro intenso per espandere il trattato; aprile 1686 Newton presenta e dedica alla Royal Society il primo libro dei *Principia*. | Documentato |
| 1687 | Pubblicazione dei *Philosophiæ Naturalis Principia Mathematica*, dove compaiono le tre leggi nella sezione "Assiomi, ovvero leggi del moto". Halley ne cura e finanzia la stampa (**DA VERIFICARE prima di inserire il finanziamento**). | Documentato (data di stampa); finanziamento DA VERIFICARE |

### 6.2 Punti storici delicati (devono comparire, con onestà)
1. **Le leggi non nascono dalla mela.** La mela è legata alla gravitazione, non direttamente alle tre leggi del moto. Dirlo esplicitamente nella pagina storia.
2. **La seconda legge nei Principia non è scritta come F = ma.** Newton la formula in termini di variazione della "quantità di moto" proporzionale alla forza motrice impressa. La forma moderna F = m·a è una riformulazione successiva (attribuita a Eulero, 1700s: **DA VERIFICARE con fonte prima di nominare Eulero**). Presentare "F = m·a" come "forma moderna".
3. **Predecessori**: Galileo (inerzia, caduta dei gravi), Descartes (inerzia rettilinea), Huygens (urti, forza centrifuga), Kepler (orbite), Hooke/Wren/Halley (discussione sulla forza inversa al quadrato). **Controversia Hooke–Newton** sulla priorità della legge dell'inverso del quadrato: citare come "Dibattito", senza prendere posizioni caricate; DA VERIFICARE i dettagli (lettere 1679–1680, 1686) prima di scrivere.
4. **Enunciati originali**: le tre leggi vanno proposte (a) in parole moderne semplici, (b) come "forma originale in latino" solo se si cita una edizione di pubblico dominio (Principia 1687, 3ª ed. 1726 sono di pubblico dominio) e (c) con link alla fonte. Non riprodurre traduzioni moderne protette da copyright.
5. Newton applicò le leggi anche a pianeti e maree: accennare, senza dilungarsi.

### 6.3 Regola anti-allucinazione
Se serve un fatto non presente in 6.1/6.2, l'agente deve **fermarsi e aggiungere la voce in `docs/TODO-VERIFICA.md`**, lasciando nel testo un segnaposto `[[DA VERIFICARE]]` e il build deve fallire (script `tools/check-placeholders.js` o grep in CI) se rimane un segnaposto in `main`.

### 6.4 Fonti primarie/secondarie da usare in `fonti.html`
- Isaac Newton, *Principia* (1687) — scansioni di pubblico dominio (es. Cambridge Digital Library: MS Add. 3965 e collezione Newton).
- Cambridge Digital Library, "Papers connected with the Principia (MS Add. 3965)".
- National Trust, pagina storica di Woolsthorpe Manor (mela, 1665–67).
- Isaac Newton Institute, pagina sul melo (citazione Stukeley).
- Stanford Encyclopedia of Philosophy, "Newton's Principia" (voce).
- Encyclopaedia Britannica, "Newton's laws of motion".
- NOVA/PBS, "Newton's Dark Secrets".
- Aggiungere URL esatti, data di consultazione e licenza. Verificare che ogni URL risponda 200.

## 7. Struttura narrativa del sito

**Home** — promessa in una riga ("Scopri come un'idea sul moto ha cambiato il mondo"), tre card colorate (le tre leggi), pulsante primario "Inizia dal viaggio storico", selettore lingua e tema.

**Storia (timeline interattiva)** — scorrimento verticale con tappe di 6.1, ciascuna: data, titolo, 2–3 frasi, badge di affidabilità, "Perché conta per le leggi?". Alla fine di ogni blocco un ponte verso la legge corrispondente ("Prima di Newton: Galileo → vai alla Legge 1").

**Ogni pagina Legge** segue lo stesso schema (Predici → Sperimenta → Spiega → Verifica):
1. Domanda-gancio (es. "Perché una palla smette di rotolare?").
2. Mini-storia (2–4 frasi, collegata alla timeline).
3. **Predici**: scelta rapida (3 opzioni) prima di avviare la simulazione; il feedback arriva dopo.
4. **Simulazione** (sez. 8).
5. **Idea chiave** in linguaggio semplice + formula, con spiegazione di ogni simbolo e unità.
6. Misconcezioni frequenti (2–3, vedi sezione 8).
7. Mini-verifica (2–3 domande con feedback formativo, non punitivo).
8. Navigazione: precedente/successiva.

## 8. Simulazioni interattive — requisiti didattici e tecnici

### 8.0 Motore comune (`engine.js`)
- Rendering su `<canvas>` 2D con scaling per `devicePixelRatio`; resize responsivo.
- Integrazione a **passo fisso** (es. 1/120 s, semi-implicit Euler o velocity Verlet) con accumulatore; rendering via `requestAnimationFrame`. Il tempo fisico è indipendente dal frame rate.
- Unità SI, mostrate in UI. Scala pixel↔metri dichiarata e costante per simulazione.
- API: `init(canvas, opts)`, `start/pause/reset/step()`, `setParam(name, value)`, `getState()`, `on('event', cb)`, `destroy()`.
- Pausa automatica quando la scheda non è visibile (`visibilitychange`).
- Disegno di vettori con frecce **proporzionali** e legenda con scala ("1 freccia = 10 N").
- Grafici semplici in tempo reale (v–t, x–t, a–t) disegnati su canvas, con asse etichettato; zero librerie.
- Testabile: funzioni fisiche pure separate dal rendering (in `sim/*.js`), con test eseguibili in `tests/physics.test.html` (assert minimali).

### 8.1 Simulazione 1 — Inerzia ("Il carrello sul ghiaccio")
**Concetto da far capire**: senza forza risultante, la velocità non cambia; l'attrito è una forza, non "la natura del moto".
- Scena: carrello su una superficie orizzontale; vista laterale.
- Controlli: spinta iniziale (impulso, slider), coefficiente d'attrito μ (da 0 a 0.5 con preset: Ghiaccio, Legno, Gomma, **Spazio (0)**), massa (0.5–10 kg), pulsante "Dai una spinta".
- Output: vettore velocità, vettore forza di attrito, grafico v–t, contatore "forza risultante: X N".
- Momenti didattici: con μ = 0 il carrello prosegue con v costante; confronto fianco a fianco "con attrito / senza attrito" (due corsie).
- Esperimento secondario "Tovaglia": scena opzionale M6 — oggetto su un panno tirato rapidamente (concetto: inerzia dell'oggetto; usare con cautela, spiegare i limiti).
- Misconcezioni da trattare: "serve una forza per mantenere il moto", "l'inerzia è una forza", "gli oggetti pesanti hanno più inerzia, quindi cadono più veloci".
- Frase-chiave: *"Un corpo non cambia il suo moto da solo: serve una forza che lo cambi."*
- Equivalente testuale esempio: "Carrello da 2 kg, attrito zero: velocità costante 3 m/s."

### 8.2 Simulazione 2 — F = m·a ("Spingi il carrello")
**Concetto da far capire**: a parità di forza, più massa = meno accelerazione; a parità di massa, più forza = più accelerazione; la direzione di a è quella della forza risultante.
- Scena: carrello su pista senza attrito (attrito opzionale con toggle), forza applicata con slider (0–50 N) e/o trascinamento della freccia con mouse/touch e tastiera (frecce ←→, passo 1 N, Maiusc ×5).
- Controlli: forza F, massa m (0.5–20 kg), attrito on/off, direzione (destra/sinistra).
- Output in tempo reale: F, m, a = F/m, v, x; grafici a–t e v–t; "tabella degli esperimenti" che salva le ultime 5 prove (forza, massa, accelerazione misurata) per far **scoprire il rapporto** (lezione tipo laboratorio).
- Modalità "Scopri la regola": l'utente varia una variabile alla volta; messaggio guida testuale "Prova a raddoppiare la forza, cosa succede ad a?".
- Modalità "Sfida": raggiungi la linea del traguardo in tempo T scegliendo F e m (feedback con indizi, mai solo "sbagliato").
- Secondo scenario facoltativo: due carrelli, stessa forza, masse diverse, gara visiva.
- Misconcezioni: "la velocità è proporzionale alla forza", "la forza è nel corpo", "massa e peso sono la stessa cosa" (distinguere in una callout).
- Nota storica visibile nel pannello: "Newton scrisse la legge in termini di variazione della quantità di moto; F = m·a è la forma moderna."
- Frase-chiave: *"La forza risultante cambia la velocità: più massa, più difficile cambiarla."*

### 8.3 Simulazione 3 — Azione e reazione ("Pattini e Razzo")
**Concetto da far capire**: le forze nascono **in coppia**, agiscono su **corpi diversi**, hanno stessa intensità e verso opposto; gli effetti sul moto dipendono dalle masse.
- Scena A "Due pattinatori": due figure su ghiaccio che si spingono; masse regolabili (30–100 kg); mostrare due frecce di forza uguali e opposte, ciascuna sul proprio corpo, con etichette "F su B da A" e "F su A da B". Dopo la spinta: velocità inversamente proporzionali alle masse (conservazione della quantità di moto, mostrata come conseguenza, senza gergo eccessivo).
- Scena B "Razzo/Palloncino": getto di gas verso sinistra → razzo spinto a destra; slider portata del getto e massa; spiegare che non serve "aria su cui appoggiarsi" (funziona nel vuoto), con attenzione a non semplificare in modo errato.
- Scena C (facoltativa, M6) "Due dinamometri": tirare uno con l'altro mostrando letture uguali.
- Misconcezioni: "il più forte spinge di più", "le due forze si annullano" (**chiarire che agiscono su corpi diversi**), "un camion colpisce l'auto con più forza dell'auto sul camion".
- Frase-chiave: *"Ogni volta che A spinge B, B spinge A con la stessa forza, in verso opposto."*

### 8.4 Pattern didattici comuni
- Predici-Osserva-Spiega prima di rivelare la spiegazione.
- Un solo concetto nuovo per schermata; formula mostrata solo **dopo** l'esperienza.
- Feedback incoraggiante e specifico; mai punteggio negativo.
- Reset sempre visibile; stato iniziale sensato; parametri con valori di default che producono subito un risultato chiaro.
- Ogni simulazione ha un link "Come funziona la fisica (per i curiosi)" con l'equazione usata dal motore.

### 8.5 Accuratezza fisica — criteri di test
- Inerzia con μ = 0: |v(t) − v0| < 1e-9 dopo 60 s simulati.
- Seconda legge: per F = 10 N, m = 2 kg, a misurata = 5.00 ± 0.01 m/s².
- Terza legge: somma delle quantità di moto del sistema isolato costante entro 1e-6 relativo.
- Indipendenza dal frame rate: stesso risultato a 30, 60, 144 Hz simulati.

## 9. Multilingua (IT / EN)

- File `assets/i18n/it.json` e `en.json` con chiavi gerarchiche (`home.title`, `law1.keyIdea`…). Nessun testo hardcoded nell'HTML tranne fallback minimo.
- `i18n.js`: legge `?lang=`, poi `localStorage`, poi `navigator.language`; default `it`. Aggiorna `document.documentElement.lang`, titolo pagina, `meta description`, testi `data-i18n`, `aria-label`, `aria-valuetext` e messaggi delle simulazioni.
- Cambio lingua senza ricaricare, mantenendo lo stato della simulazione; annunciare il cambio con `aria-live`.
- Formattazione numeri con `Intl.NumberFormat` (virgola decimale in IT).
- Architettura estensibile: aggiungere una lingua = aggiungere un JSON + voce nel selettore.
- `hreflang` e `link rel=alternate` quando si usano URL per lingua (opzionale: `/it/` e `/en/`).
- Test: script che confronta le chiavi di it.json ed en.json e fallisce se ne mancano.
- Traduzioni naturali, non letterali; nomi propri e titoli latini invariati.

## 10. Prestazioni
Nessuna dipendenza esterna; JS per pagina caricato con `type="module"`; simulazioni inizializzate solo quando visibili (`IntersectionObserver`); canvas ≤ 1 per vista attiva; CSS critico inline opzionale; immagini SVG ottimizzate; Lighthouse in CI opzionale.

## 11. Qualità, test, sicurezza
- Lint: ESLint (config minima) e Prettier facoltativi, eseguibili con `npx`, non obbligatori per il deploy.
- Test fisica: pagina `tests/physics.test.html` + opzionale Node `node --test`.
- Test manuali: checklist in `docs/TESTING.md` (tastiera, screen reader, zoom, mobile, reduced-motion, offline).
- Sicurezza: Content-Security-Policy via `<meta http-equiv>` (`default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'`), nessun `innerHTML` con dati non fidati, `rel="noopener noreferrer"` sui link esterni.
- Privacy: nessun analytics.

## 12. SEO e condivisione
`<title>` e `meta description` per pagina e lingua, Open Graph/Twitter card con immagine SVG→PNG generata, `sitemap.xml`, `robots.txt`, JSON-LD `LearningResource` (opzionale).

## 13. Deploy su GitHub Pages
1. Repository pubblico `newton-in-movimento` (nome modificabile).
2. File `.nojekyll` nella root.
3. Workflow `.github/workflows/pages.yml` con `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages` (permessi `pages: write`, `id-token: write`), trigger su push a `main`; verificare le versioni correnti delle action al momento dell'implementazione.
4. Step di controllo in CI: segnaposto `[[DA VERIFICARE]]` assenti, chiavi i18n allineate, link interni validi.
5. Settings → Pages → Source: GitHub Actions.
6. `README.md`: descrizione, screenshot, come eseguire in locale (`python3 -m http.server`), licenze, come contribuire con traduzioni.
Nota: i moduli ES e `fetch` locale richiedono un server HTTP, non `file://`.

## 14. Milestone e criteri di accettazione

| # | Milestone | Accettazione |
|---|---|---|
| M1 | Scheletro: repo, token CSS, layout, header/footer, i18n IT/EN, tema chiaro/scuro, skip link | Navigazione da tastiera ok; cambio lingua e tema funzionano; Lighthouse A11y ≥ 95 |
| M2 | Home + pagina Storia con contenuti di 6.1 e badge di affidabilità, `fonti.html` | Nessun fatto fuori dalla tabella; ogni voce ha una fonte; nessun `[[DA VERIFICARE]]` |
| M3 | Motore simulazione + Sim 1 (inerzia) con equivalente testuale e test fisica | Criteri 8.5 inerzia superati; usabile solo da tastiera |
| M4 | Sim 2 (F = m·a) con tabella esperimenti e modalità "Scopri la regola" | Criterio 8.5 seconda legge; slider accessibili |
| M5 | Sim 3 (azione-reazione) scena A e B | Frecce di forza su corpi distinti; criterio conservazione quantità di moto |
| M6 | Quiz/mini-verifiche, scene facoltative, rifiniture UX | Feedback formativo; nessun errore console |
| M7 | Accessibilità audit completo (axe, screen reader, zoom 200%, reduced-motion) | Zero violazioni critiche/gravi; report in `docs/TESTING.md` |
| M8 | Prestazioni, Service Worker opzionale, SEO, CSP | Perf ≥ 90; funziona offline (se SW attivo) |
| M9 | CI + deploy GitHub Pages + README + CREDITS | URL pubblico funzionante; link verificati |

## 15. Fuori ambito (per ora)
Account utente, database, commenti, analytics, backend, framework SPA, librerie fisiche esterne, lingue oltre IT/EN, app mobile nativa.

## 16. Definition of Done globale
- [ ] Tutte le pagine in IT e EN, senza chiavi mancanti.
- [ ] Ogni simulazione: controlli accessibili, testo alternativo vivo, reset, pausa, passo-passo.
- [ ] Contenuti storici solo da sez. 6, con fonti, badge Fatto/Tradizione/Dibattito.
- [ ] Contrasti verificati (chiaro e scuro).
- [ ] Nessuna richiesta di rete esterna a runtime.
- [ ] Deploy Pages online, README e CREDITS completi.

## 17. Prompt operativi per Mistral Vibe (modalità code)

**Avvio**
> Leggi `docs/SPEC.md` per intero. Non scrivere codice ancora. Rispondi con: (1) riepilogo in 10 righe, (2) lista delle ambiguità, (3) piano per M1 con i file che creerai.

**Per ogni milestone**
> Implementa solo la milestone Mx di `docs/SPEC.md`. Rispetta vincoli sez. 2, 5, 9. Al termine: esegui i controlli di accettazione, elenca cosa è passato/fallito, aggiorna `docs/DECISIONS.md`, fai commit `feat(Mx): ...`. Non iniziare Mx+1.

**Verifica storica**
> Rivedi tutti i testi della pagina storia: per ogni affermazione indica la riga di sez. 6 che la supporta. Segnala qualsiasi frase non supportata.

**Revisione accessibilità**
> Esegui la checklist di sez. 5 su tutte le pagine e riporta le violazioni con file e riga.
