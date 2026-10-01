# Verifiche della versione 0.1.0

## Collaudo locale del 5 settembre 2026

Eseguito su macOS con Node.js 22.14.0 e le dipendenze del lockfile presente.

- Corretto TS4023 esportando `ModelElement` da `ModelViewer.vue`: la generazione delle dichiarazioni della libreria falliva, anche nello script `prepare` usato dall'installazione.
- `npm run check`: superati 34 test, controllo completo TypeScript, build della libreria e build della demo. Rimane il warning Vite sui chunk superiori a 500 kB.
- Renderer reale Chromium: verificati aggiunta e modifica di un punto, cattura camera, salvataggio IndexedDB, ricaricamento, riapertura e anteprima; nessuna eccezione JavaScript nel flusso.
- Corretti i test browser: scorrimento del viewer prima di clic e trascinamento; apertura del selettore Vuetify tramite ArrowDown.
- Controllate schermate desktop e mobile; a 390 px la larghezza del documento è 390 px. Nessun errore console nella prova diagnostica.
- Vite avviato su `http://127.0.0.1:5173/`, risposta HTTP 200.

Chromium non era installato per Playwright. Per questo collaudo è stato scaricato in una cartella temporanea e i test sono stati eseguiti con:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/model-hotspot-editor-playwright npm run test:browser
```

Per installarlo nel percorso standard usare `npx playwright install chromium`.
Firebase e pubblicazione restano non verificati. Il resoconto originale seguente descrive esclusivamente l'ambiente di preparazione del 4 settembre.

## Resoconto originale del 4 settembre 2026

## Stato della consegna

Questo archivio contiene il codice sorgente della libreria, della demo e dei connettori. Non contiene una build di produzione già collaudata. L'installazione completa delle dipendenze npm non è stata possibile nell'ambiente di preparazione: la risoluzione DNS di registry.npmjs.org termina con EAI_AGAIN. Per questo non si può dichiarare superato il collaudo completo del progetto.

I controlli effettivamente eseguiti sono separati qui dai test solamente predisposti. Non sono stati creati progetti Firebase, repository GitHub o distribuzioni pubbliche per conto dell'utente.

## Risultati

| Controllo | Esito | Ambito reale |
|---|---|---|
| Compilazione TypeScript del dominio e dell'adapter locale | Superato | TypeScript 5.8.3, strict e noUncheckedIndexedAccess; `tsconfig.test.json`. |
| Test automatici della logica | 34 superati, 0 falliti | Validazione dello schema, URL, GLB, azioni immutabili, importazione, gesti e revisioni. |
| Regressione PointerEvent con proprietà ereditate | Superato dopo correzione | Prima della correzione il test fallisce; dopo la correzione passa. |
| Trasformazione sintattica di 19 moduli TypeScript/script SFC | Nessuna diagnostica sintattica | Non equivale al controllo dei tipi dell'applicazione completa. |
| Interfaccia Vue/Vuetify in Chromium | Superato con renderer simulato | Vue 3.5.13 e Vuetify 3.11.2 reali; componente model-viewer sostituito da uno stub di test. |
| Flussi UI verificati | 8 verificati | Creazione, modifica, riposizionamento, rifiuto del trascinamento, cattura camera, riordino, anteprima e conferma eliminazione. |
| Larghezza mobile dell'editor | Superato | Viewport 390 px, larghezza contenuto 390 px, nessun overflow orizzontale nella prova. |
| Errori/warning del browser nella prova isolata | Nessuno | Solo il test UI con renderer simulato descritto sopra. |
| Installazione completa delle dipendenze | Bloccata | npm: EAI_AGAIN verso registry.npmjs.org. |
| `npm run typecheck` | Non eseguito con le dipendenze richieste | vue-tsc non disponibile dopo il fallimento di installazione. |
| `npm run build` / `npm run build:demo` | Non verificati | Vite non disponibile dopo il fallimento di installazione. |
| Rendering GLB e selezione reale della superficie | Non verificati | Il motore model-viewer non è stato eseguito. Il test UI non prova WebGL, materiali o raycasting. |
| Persistenza IndexedDB reale | Non verificata | Il browser dell'ambiente vieta la navigazione localhost/file; il contesto isolato usato per la UI non ha un'origine con IndexedDB utilizzabile. |
| Firebase SDK, regole, emulatori, upload e transazioni | Non verificati end-to-end | Non è stato collegato alcun progetto Firebase. Gli SDK completi non erano installabili. |
| Test Playwright inclusi in `tests/browser/` | Predisposti, non eseguiti qui | Sono destinati a Vite con model-viewer e IndexedDB reali. |
| Workflow GitHub Actions / Pages | Predisposti, non eseguiti | Richiedono la pubblicazione del repository e l'attivazione delle funzionalità GitHub. |

Le prove isolate non dimostrano la compatibilità di tutte le combinazioni di versioni ammesse dal package.json. Non è stata eseguita una revisione indipendente da un secondo sviluppatore.

## Comandi da eseguire sul computer di sviluppo

Usare Node.js 22.12 o successivo e una connessione funzionante al registro npm:

```bash
npm install
npm run check
npx playwright install chromium
npm run test:browser
npm run dev
```

`npm install` esegue anche lo script prepare che costruisce la libreria. Un suo fallimento va letto e corretto, non ignorato. Committare il package-lock.json prodotto dalla prima installazione riuscita per fissare le versioni risolte. Successivamente è possibile usare npm ci nei workflow.

`npm run check` esegue test unitari, controllo completo dei tipi, build della libreria e build della demo. I test browser sono separati perché richiedono Chromium.

## Collaudo manuale minimo prima dell'integrazione

1. Aprire la demo: il vaso originale incluso deve essere visibile, ruotabile e zoomabile.
2. Caricare un proprio GLB autosufficiente; creare due punti in posizioni riconoscibili.
3. Modificare titoli e contenuti, spostare un punto e memorizzare un'inquadratura.
4. Salvare nel browser, ricaricare la pagina e riaprire la scena dalla libreria locale. Verificare modello, punti, media e camera.
5. Esportare JSON e GLB, aprire una nuova scena con quel GLB e importare il JSON. L'importazione deve rifiutare un GLB differente.
6. Aprire la stessa scena in due schede e verificare il rifiuto di un secondo salvataggio basato su una revisione ormai superata.
7. Provare un dispositivo touch e un modello più impegnativo, controllando memoria, tempi e precisione dei punti.
8. Seguire docs/FIREBASE.md su un progetto di test; verificare login, upload, riapertura e rifiuto dell'accesso con un altro utente.
9. Provare le regole Firebase negli emulatori prima di adattarle alle collezioni e ai ruoli del CMS.

La versione corrente tratta modelli statici: non modifica la geometria e non implementa l'ancoraggio a superfici deformate da animazioni. La visibilità dei marker usa l'orientamento della normale, non un test completo di occlusione. L'adapter Firebase fornito è privato per utente: la pubblicazione per visitatori anonimi richiede un flusso e regole dedicati.
