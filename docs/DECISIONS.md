# Decisioni di progetto

Registro delle scelte prese dove la SPEC era ambigua o lasciava più opzioni (SPEC sez. 0.3).

## Architettura
- **Pagine HTML separate** (SPEC sez. 2) con header/footer duplicati nelle pagine e mantenuti da uno script di build **facoltativo** (`tools/build.js`). Il sito funziona così com'è nel repository: il build serve solo a rigenerare parti condivise e testi di fallback dopo una modifica.
- **Unica fonte dei testi: i JSON** in `assets/i18n/`. `tools/build.js` scrive nell'HTML il testo italiano di fallback di ogni elemento `data-i18n`, così le pagine sono leggibili e indicizzabili anche senza JavaScript. La CI (`build.js --check`) fallisce se HTML e `it.json` divergono.
- **Mini-markup nei testi** (`**grassetto**`, `*corsivo*`, `[testo](url)`), convertito in nodi DOM (`assets/js/richtext.js`): niente `innerHTML` con i testi tradotti.
- **Blocchi generati** (`<!-- @question -->`, `<!-- @predict -->`, `<!-- @event -->`, `<!-- @myths -->`, `<!-- @pager -->`) per evitare markup ripetitivo scritto a mano.
- **Moduli per pagina** in `assets/js/pages/` (non previsti dall'albero della SPEC): separano il codice di interfaccia dalla fisica pura (`assets/js/sim/sim-*.js`), che resta importabile da Node per i test. Aggiunti anche `assets/js/quiz.js`, `assets/js/richtext.js`, `assets/js/sim/sim-ui.js`.
- **API del motore**: la SPEC cita `init(canvas, opts)`; il motore espone `createSimulation({ model, render })` che restituisce `start/pause/reset/step/setParam/getState/on/destroy`. Il canvas è gestito dalla pagina (`setupCanvas`), così il motore resta indipendente dal disegno.
- **Un solo canvas per simulazione**: scena e grafici (v–t, a–t) sono disegnati nello stesso canvas (SPEC sez. 10: canvas ≤ 1 per vista attiva).
- **Tema senza lampo**: `assets/js/theme-init.js` è uno script classico, sincrono, nel `<head>` (gli script inline sono vietati dalla CSP).

## Fisica
- Integrazione: Eulero semi-implicito a passo fisso 1/120 s con accumulatore e tolleranza 1e-9 sull'arrotondamento (1/30 s = esattamente 4 passi).
- Legge 1: la spinta è un impulso J (N·s), Δv = J/m. Attrito dinamico costante μ·m·g; il carrello si ferma senza invertire il moto. Pista "ad anello" (12 m visibili) perché con μ = 0 il carrello non si fermerebbe mai. Preset: Ghiaccio 0,02, Legno 0,25, Gomma 0,5 (massimo consentito dalla SPEC), Spazio 0.
- Legge 2: pista di 20 m; la forza agisce finché il carrello arriva a fine pista, poi la prova viene registrata. Attrito opzionale μ = 0,1 con attrito statico. Accelerazione "misurata" = Δv/Δt dall'inizio della prova. Sfida: traguardo a 10 m, tempi 2 / 2,5 / 3 / 4 s, tolleranza ± 0,1 s; in sfida attrito e direzione sono bloccati.
- Legge 3, pattinatori: forza di contatto costante 300 N per 0,4 s. Razzo: velocità di scarico 40 m/s, 20 kg di carburante; la nuova velocità a ogni passo deriva dalla conservazione della quantità di moto (conservazione esatta, verificata dai test e coerente con l'equazione di Ciolkovskij).
- Le scale delle frecce (px per N, px per m/s) dipendono dalla larghezza del canvas ma restano costanti durante la simulazione; la legenda mostra sempre la scala corrente.

## Contenuti
- Esclusi perché marcati DA VERIFICARE nella SPEC: finanziamento della stampa da parte di Halley, il nome di Eulero per F = m·a, i dettagli (lettere, date) della controversia Hooke–Newton. La controversia è citata solo come "Dibattito", senza dettagli.
- La mela: presentata come "Tradizione"; il dettaglio della mela in testa è dichiarato non documentato.
- **Enunciati latini**: testo della 3ª edizione (1726), pubblico dominio. Le traduzioni sono nostre (nessuna traduzione moderna protetta).
- La tappa "Molte menti al lavoro" collega Huygens (urti) alla Legge 3 per affinità fisica, senza affermare un nesso storico diretto.
- La voce "Isaac Newton Institute, pagina sul melo" della SPEC non è stata inserita in `fonti.html`: l'URL non è stato trovato (vedi `docs/TODO-VERIFICA.md`).

## Interazione
- **Previsione bloccata**: dopo aver confermato una previsione e usato la simulazione, la scelta non si può più cambiare (altrimenti "Predici → Osserva" perde senso).
- **Trascinamento della forza (Legge 2)**: si afferra la freccia F, che parte dal bordo del carrello nel verso della forza; il lato del carrello in cui si porta la punta decide il verso. Il trascinamento parte solo toccando la freccia, così chi scorre la pagina su mobile non cambia la forza per errore. In modalità Sfida il verso è bloccato.
- **Annunci dei cursori** limitati a uno al secondo (lo screen reader legge già il valore del cursore).
- **"Avvia" nella scena A della Legge 3** equivale a "Spingi!" e riparte da capo se i pattinatori sono arrivati al bordo.
- **Crediti**: il link del footer porta a `fonti.html#crediti` (pagina HTML) invece che a `CREDITS.md`, che su Pages verrebbe servito come testo grezzo.

## Scene facoltative non implementate (M6)
"Tovaglia" (Legge 1), gara tra due carrelli (Legge 2), "Due dinamometri" (Legge 3): facoltative nella SPEC, rinviate per tenere ogni pagina focalizzata su un solo concetto.

## Licenza
La SPEC indica MIT per il codice, ma il repository contiene già `LICENSE` Apache 2.0, scelta dal proprietario alla creazione. Non è stata cambiata: Apache 2.0 è comunque permissiva e compatibile con l'uso previsto. Se si preferisce MIT, basta sostituire il file `LICENSE`.

## Hosting, SEO, offline
- URL di pubblicazione ipotizzato: `https://monaripietro.github.io/leggiDiNewton/` (usato in `canonical`, `hreflang`, `og:image`, `sitemap.xml`, `robots.txt`, che richiedono URL assoluti). Tutti gli altri percorsi sono relativi.
- Lingua per URL tramite `?lang=it|en` (nessuna duplicazione di pagine in `/it/` e `/en/`). L'HTML statico è in italiano e l'inglese esiste solo con JavaScript: per questo **non** si dichiarano link `hreflang` (punterebbero a contenuto italiano). Pagine statiche `/en/` richiederebbero un'estensione di `tools/build.js`.
- Service Worker con strategia "prima la rete, poi la cache": contenuti sempre aggiornati online, consultabili offline dopo la prima visita. Registrato solo in contesti sicuri (HTTPS o localhost).
- Versioni delle GitHub Actions (`checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4`): non è stato possibile verificarle online durante lo sviluppo; controllarle al primo deploy.
- `.github/workflows/pages.yml` pubblica solo i file del sito (`_site/`), non `docs/`, `tools/`, `tests/`, `partials/`.
