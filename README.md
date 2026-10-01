# Model Hotspot Editor

Visualizzatore GLB e editor di punti di interesse per **Vue 3**, con interfaccia
**Vuetify 3** e connettori opzionali **IndexedDB** e **Firebase**.

Versione iniziale 0.1.0. Il repository contiene sorgenti, una demo, un modello
procedurale originale, test e configurazioni di build. Consulta
[il report di verifica](docs/VERIFICATION.md) per gli esiti del collaudo locale
e le verifiche ancora necessarie prima dell’uso in produzione.

## Avvio

Richiede Node.js 22.12 o successivo della linea 22 (oppure una versione supportata più recente).

```bash
npm install
npm run dev
```

Apri l’indirizzo mostrato da Vite, normalmente `http://127.0.0.1:5173`.
Il primo comando installa le dipendenze e compila la libreria attraverso `prepare`.
Non servono credenziali Firebase per la modalità **Nel browser**.
Dopo la prima installazione, aggiungi a Git il `package-lock.json` generato.

La demo apre un piccolo vaso sintetico. Puoi caricare un tuo **GLB autosufficiente**,
ruotarlo, premere **Aggiungi punto** e fare clic sulla superficie. Un trascinamento
non viene interpretato come un nuovo punto. Seleziona poi un punto per modificarlo.

Per caricare un GLB diverso viene creata una nuova scena: i vecchi punti non vengono
trasferiti silenziosamente su una geometria diversa. Le modifiche non salvate
richiedono conferma prima di cambiare scena.

## Funzionalità incluse

- Viewer con rotazione, zoom, spostamento e marker numerati.
- Editor per creare, riposizionare, riordinare ed eliminare punti.
- Titolo e descrizione per punto, inquadratura associata, vista iniziale della scena.
- ID di contenuto del CMS e URL opzionali di immagine, audio e approfondimento.
- Anteprima visitatore e slot per usare le schede del CMS al posto del contenuto standard.
- Salvataggio locale di JSON e GLB in IndexedDB; salvataggio remoto con Firebase.
- Import/export JSON e download separato del modello locale.
- Associazione degli hotspot al GLB attraverso SHA-256; controllo delle revisioni.

I media aggiuntivi sono associati **tramite URL**, non caricati dalla libreria.
Questa versione annota **modelli statici**: non modifica vertici, materiali o mesh e
non ancora i punti alle deformazioni di un personaggio animato.

## Struttura

```text
src/
  components/ModelViewer.vue     # viewer senza Vuetify o Firebase
  components/ModelEditor.vue     # editor Vuetify sopra lo stesso viewer
  components/HotspotForm.vue     # pannello proprietà del punto
  composables/useModelSession.ts # orchestration load/save e URL temporanei
  adapters/local.ts             # IndexedDB: scene + GLB
  adapters/firebase.ts          # Firestore + Storage, Auth fornita dal CMS
  domain/                       # schema, gesti, GLB, editing, revisioni
  types.ts                      # contratti TypeScript pubblici
demo/                           # applicazione Vite autonoma
examples/CmsModelField.vue       # integrazione con istanze Firebase esistenti
firebase/                       # regole private per utente e CORS di sviluppo
docs/                           # integrazione, API, verifica, decisioni
```

## Riutilizzo come pacchetto

Il nome `model-hotspot-editor` è quello impostato in `package.json`:
**non implica che il pacchetto sia già pubblicato su npm** o che lo scope sia riservato.
Puoi modificarlo prima di pubblicare.

Per provarlo nel CMS senza pubblicarlo su npm:

```bash
# Nel progetto Model Studio
npm install
npm pack

# Nel CMS: usa il percorso reale dell'archivio appena generato
npm install /percorso/model-hotspot-editor-0.1.0.tgz
```

Importa lo stile una volta, ad esempio nel `main.ts` del CMS:

```ts
import 'model-hotspot-editor/style.css';
```

### Solo visualizzazione

```vue
<script setup lang="ts">
import { ModelViewer, type SceneDocument } from 'model-hotspot-editor';
defineProps<{ scene: SceneDocument; modelUrl: string }>();
</script>

<template>
  <ModelViewer
    :src="modelUrl"
    :alt="scene.title"
    :hotspots="scene.hotspots"
    :initial-camera="scene.initialCamera"
  />
</template>
```

Questo import non richiede Vuetify né Firebase. Il componente carica il motore
model-viewer al mount, quindi non lo inizializza sul server durante SSR.
Per Nuxt, la strada più semplice è montare l’esperienza dentro `ClientOnly`.

### Editor e Firebase nel CMS

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { ModelEditor } from 'model-hotspot-editor/editor';
import { useModelSession } from 'model-hotspot-editor';
import { createFirebaseRepository } from 'model-hotspot-editor/firebase';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

const props = defineProps<{
  firestore: Firestore;
  storage: FirebaseStorage;
  userId: string;
  sceneId?: string;
}>();

const repository = createFirebaseRepository({
  firestore: props.firestore,
  storage: props.storage,
  getUserId: () => props.userId
});
const {
  document, modelUrl, busy, error, dirty,
  openFile, load, save
} = useModelSession(repository);

onMounted(() => {
  if (props.sceneId) void load(props.sceneId);
});

async function chooseModel(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file && (!dirty.value || window.confirm('Abbandonare le modifiche non salvate?'))) {
    await openFile(file);
  }
}
</script>

<template>
  <div>
    <input type="file" accept=".glb" :disabled="busy" @change="chooseModel" />
    <p v-if="error" role="alert">{{ error }}</p>
    <ModelEditor v-model="document" :src="modelUrl" :disabled="busy" />
    <button :disabled="busy || !document.model" @click="save">Salva</button>
  </div>
</template>
```

Passa le istanze già inizializzate dal tuo CMS. **Non chiamare una seconda volta
`initializeApp()` o `createVuetify()` dentro il componente.**
L’editor presuppone il plugin Vuetify 3 e il suo `v-app` già presenti nell’applicazione.
Usa un `:key="userId + ':' + sceneId"` sul wrapper quando cambi utente o documento,
oppure gestisci esplicitamente reset/caricamento e le guardie per modifiche pendenti.

`examples/CmsModelField.vue` contiene una versione completa del wrapper con eventi
`saved` e `select`. Nel CMS integra anche `dirty` con la guardia di navigazione:
la conferma `beforeunload` è installata dalla demo, non dal componente di libreria.

### Contenuti già presenti nel CMS

Il punto contiene un `contentId`: la libreria non tenta di indovinare la struttura
delle collezioni del tuo CMS. Puoi intercettare `select`, recuperare il contenuto
con il servizio esistente e usare lo slot `hotspot-content`.

```vue
<ModelViewer :src="modelUrl" :hotspots="scene.hotspots" @select="onPointSelected">
  <template #hotspot-content="{ hotspot }">
    <CmsContentCard v-if="hotspot.contentId" :content-id="hotspot.contentId" />
    <p v-else>{{ hotspot.description }}</p>
  </template>
</ModelViewer>
```

`CmsContentCard` è il componente del tuo CMS, non una dipendenza di questo progetto.
Lo stesso slot è disponibile su `ModelEditor` nell’anteprima visitatore.

## Configurazione Vue

La build della libreria riconosce già `model-viewer` come custom element.
Nel CMS serve aggiungere questa opzione **solo se copi i file .vue sorgente oppure
usi direttamente il tag model-viewer**:

```ts
vue({
  template: {
    compilerOptions: { isCustomElement: tag => tag === 'model-viewer' }
  }
})
```

Non usare una regola generica per tutti i tag con trattino: includerebbe anche i tag Vuetify.

## Firebase

La demo opzionale usa Email/Password. Copia `.env.example` in `.env`, configura la
Web App Firebase e segui [docs/FIREBASE.md](docs/FIREBASE.md).

Percorsi predefiniti:

```text
Firestore: users/{uid}/modelScenes/{sceneId}
Storage:   users/{uid}/models/{sha256}.glb
```

Sono dati **privati per utente**. Non è inclusa una procedura di pubblicazione
anonima per il sito pubblico. Adatta autorizzazioni e pubblicazione al modello
museo/tenant del CMS, senza aprire le scritture al pubblico.

Il connettore non effettua login e non crea utenti. Nella demo il login è codice
separato in `demo/firebase-client.ts`. Le regole incluse non vanno distribuite sopra
quelle del CMS senza prima integrarle: un deploy può sostituire le regole esistenti.

## Documenti, file e limiti

`SceneDocument` ha `schemaVersion: 1`. Le coordinate sono in metri; theta e phi
della camera in radianti, campo visivo in gradi. `revision` inizia da 0 e sale a
ogni salvataggio. La transazione respinge una revisione vecchia, senza sovrascrivere
silenziosamente il lavoro di un altro editor.

L’export JSON **non contiene il GLB** né un URL `blob:` temporaneo. Per importarlo
carica prima esattamente lo stesso GLB. L’import mantiene l’ID e la revisione della
scena attualmente aperta, evitando di sovrascrivere l’ID di un altro progetto.

Limiti applicativi iniziali: 100 MiB per GLB, 100 punti, 700 KiB per documento.
La validazione del GLB controlla intestazione, versione, dimensione, chunk JSON e
risorse esterne; non sostituisce un validatore glTF completo.

La modalità locale conserva i dati nell’origine del browser. Non è un backup:
cancellazione dei dati del sito, quote o modalità privata possono impedirne la
persistenza. Esporta i file importanti. Non è prevista pulizia automatica dei GLB
non più utilizzati.

La visibilità dei marker sfrutta l’orientamento della normale di model-viewer:
**non è un test completo di occlusione** da parte di altre mesh. I marker posteriori
sono attenuati; l’elenco testuale rimane disponibile.

I GLB compressi possono richiedere decoder caricati esternamente da model-viewer.
Per un kiosk offline distribuisci anche tali decoder e configura i loro percorsi.
Il modello dimostrativo incluso non usa compressione o texture esterne.

## Test e build

```bash
npm test                  # test del dominio TypeScript con Node
npm run typecheck         # controllo completo TypeScript + SFC
npm run build             # libreria ESM, CSS e dichiarazioni in dist/
npm run build:demo        # sito statico in demo-dist/
npx playwright install chromium
npm run test:browser      # smoke test con renderer vero + IndexedDB
```

[docs/VERIFICATION.md](docs/VERIFICATION.md) distingue test eseguiti e verifiche
ancora da effettuare. Non sono inclusi credenziali, node_modules o un lockfile
inventato. La CI esegue installazione, controlli e test browser quando fai push.

## GitHub e demo pubblica

Crea un repository e carica questa cartella. Il workflow **Checks** viene eseguito
su push e pull request. In **Settings → Pages**, scegli GitHub Actions e avvia
manualmente **Publish demo to GitHub Pages** per distribuire `demo-dist`.
La configurazione standard pubblica la demo locale, senza configurazione Firebase.

Per usare direttamente un repository Git nel CMS è disponibile lo script `prepare`,
che genera `dist` durante l’installazione da Git. Per un rilascio controllato,
preferisci tag versionati e un tarball npm oppure una pubblicazione npm dedicata.

La libreria non è stata caricata su un account GitHub durante la generazione.

## Licenza

MIT, intestata a Dario Cavada. Verifica che sia la licenza desiderata prima di rendere
pubblico il repository. Il vaso è un asset procedurale originale dello stesso
progetto, non un modello ottenuto da Sketchfab. Nessun font è incluso.

## Riferimenti tecnici

- [model-viewer: annotazioni](https://modelviewer.dev/examples/annotations/)
- [model-viewer: API](https://modelviewer.dev/docs/)
- [Vue: custom elements](https://vuejs.org/guide/extras/web-components.html)
- [Firebase: upload web](https://firebase.google.com/docs/storage/web/upload-files)
- [Firebase: download web e CORS](https://firebase.google.com/docs/storage/web/download-files)
- [Firestore: transazioni](https://firebase.google.com/docs/firestore/manage-data/transactions)


# Il percorso dell’acqua e dei boscaioli

Lo spazio, ancora da allestire, si estende per circa 100 × 60 metri. L’idea è trasformarlo in un paesaggio di piccoli laghetti e ruscelli, dove i bambini possano giocare con l’acqua, camminare scalzi e scoprire il legame tra il bosco e il lavoro dei boscaioli.

Un breve racconto accompagnerà l’esperienza. I protagonisti potranno essere le vivane e i folletti del bosco, oppure gli animali legati all’acqua: tritoni, salamandre, rane, trote, il merlo acquaiolo e un cervo che si avvicina per bere. Personaggi e incontri daranno un filo narrativo alle diverse attività.

Le “moe”, piccoli laghetti poco profondi, saranno collegate da ruscelli percorribili a piedi nudi. Il percorso seguirà l’andamento del prato, alternando acqua, attraversamenti e spazi per fermarsi a osservare e giocare.

Il cuore dell’esperienza sarà il gioco della diga. Un piccolo bacino, dotato di un’apertura regolabile — il “cogno” citato negli appunti — permetterà di liberare l’acqua necessaria a far galleggiare piccoli tronchi gonfiabili. Ogni bambino seguirà il proprio tronco lungo il ruscello, accompagnandolo fino al punto di raccolta.

Il gioco introdurrà il tema del trasporto del legname: a cosa serviva la diga e come la forza dell’acqua aiutava a portare a valle le “bore”. Il racconto degli animatori collegherà questa esperienza al trasporto invernale, quando neve e ghiaccio permettevano di far scivolare il legname.

Nella parte finale, i bambini potranno raccogliere e accatastare i tronchi da gioco, sperimentare un breve attraversamento su una zattera e portarli verso un carro. Gli animatori riprenderanno i gesti appena compiuti per spiegare il lavoro dei boscaioli e il viaggio del legno dal bosco a valle.

*Proposta di allestimento. Il concept illustrato ricostruisce liberamente una vista più alta della fotografia; non rappresenta un rilievo né una disposizione in scala. I termini locali riportati negli appunti sono mantenuti come denominazioni di lavoro.*
