# Configurazione Firebase

## Demo senza toccare il CMS

Usa preferibilmente un progetto Firebase di test.

1. Registra una Web App nella console e copia la configurazione.
2. Abilita Authentication → Email/Password; crea un utente di test nella console.
3. Crea Firestore e il bucket Cloud Storage. Per Cloud Storage verifica il requisito
   del piano Blaze e imposta avvisi di budget.
4. Copia `.env.example` in `.env` e inserisci i valori della Web App.
5. Integra e distribuisci le regole in `firebase/`, quindi avvia o riavvia `npm run dev`.
6. Nella demo seleziona Firebase, accedi, carica un GLB, aggiungi un punto e salva.
7. Riapri la scena dall’elenco per verificare un intero round trip sul tuo progetto.

La configurazione `VITE_*` finisce nel bundle client. È la configurazione pubblica
dell’app web, non un luogo per chiavi Admin o service account. `.env` è ignorato da Git.
La sicurezza è nelle regole e nell’autenticazione, non nel nascondere questa configurazione.

Comandi, dopo aver installato la Firebase CLI e autenticato il tuo account:

```bash
firebase use --add
firebase deploy --only firestore:rules,storage
```

**Attenzione:** non eseguire questo deploy sul CMS senza integrare le
regole esistenti. Questi file sono una base privata per utente, non sostituiscono
le ACL museo/organizzazione/redazione del CMS.

## CORS e lettura autenticata dei modelli

Per default il connettore usa `getBlob()`: la lettura avviene con il contesto Auth
corrente e il visualizzatore riceve un URL temporaneo locale. Il composable revoca
l’URL quando cambia modello o viene smontato.

Per gli accessi web configura il CORS del bucket. Il file `firebase/cors.local.json`
contiene soltanto le origini di sviluppo. Per applicarlo con Google Cloud CLI:

```bash
gcloud storage buckets update gs://NOME_BUCKET --cors-file=firebase/cors.local.json
```

Sostituisci `NOME_BUCKET` con il valore reale di `VITE_FIREBASE_STORAGE_BUCKET`.
Prima del deploy aggiungi le origini HTTPS effettive del CMS al file CORS.
CORS non sostituisce le regole di autorizzazione.

L’opzione `downloadMode: 'url'` usa `getDownloadURL()` e restituisce un URL con token.
Trattalo come una risorsa accessibile a chiunque possieda quel link: non usarlo
come barriera di riservatezza. Non basta nascondere il pulsante nell’interfaccia.

## Modello dei dati

Ogni record Firestore contiene:

```text
scene        SceneDocument canonico
ownerId      UID corrente
revision     copia della revisione, verificata dalle regole
updatedAt    timestamp server per l’ordinamento
```

Dentro `scene.updatedAt` c’è anche una data ISO client, utile per il formato portabile.
Non usarla come orologio fidato per l’audit: per quello c’è `updatedAt` del record.

Il file è in `users/{uid}/models/{sha256}.glb`. Le scene con lo stesso modello possono
riferirsi allo stesso asset. Il controllo dell’hash lato client previene associazioni
accidentali errate, ma non è una verifica server delle byte inviate da un utente malevolo.

L’upload termina prima della transazione Firestore. Queste due operazioni **non sono
atomiche tra servizi**. Un conflitto o un errore di scrittura può lasciare un file non
referenziato. Il connettore non lo elimina automaticamente, perché potrebbe essere
usato da un’altra scena o da un altro salvataggio. Prevedi una pulizia server solo dopo
aver verificato tutti i riferimenti e una finestra di sicurezza.

`list()` restituisce al massimo le 100 scene più recenti. Per cataloghi più grandi
aggiungi paginazione nel servizio del CMS, invece di caricare tutto nell’editor.

## Struttura museo/tenant del CMS

Il connettore accetta percorsi personalizzati:

```ts
const repository = createFirebaseRepository({
  firestore,
  storage,
  getUserId: () => auth.currentUser?.uid,
  paths: () => ({
    collection: `museums/${museumId}/modelScenes`,
    storagePrefix: `museums/${museumId}/modelAssets`
  })
});
```

In questo caso **devi adattare le regole** per verificare l’appartenenza al museo e
il ruolo editoriale. I percorsi personalizzati non concedono autorizzazioni.
I campi `contentId` degli hotspot possono riferirsi alle schede esistenti del museo.
Il backend corrente del CMS continua a decidere cosa è bozza, approvato o pubblicato.

La visualizzazione pubblica di un modello approvato è un passaggio distinto:
servi un GLB pubblicabile e il documento approvato al solo `ModelViewer`.
Non rendere pubblicamente scrivibile la raccolta dell’editor.

## Emulatori

Con la Firebase CLI e Java compatibile installati:

```bash
firebase emulators:start --project demo-model-hotspot-editor
```

Configura `.env` con `VITE_FIREBASE_PROJECT_ID=demo-model-hotspot-editor`, i valori web di test,
il bucket di test e `VITE_FIREBASE_EMULATORS=true`. Riavvia Vite e crea un utente nella
UI dell’emulatore Auth. I servizi usati sono Auth 9099, Firestore 8080, Storage 9199.
Non usare questa opzione nel bundle di produzione.

## Checklist prima della produzione

- Utente A salva e riapre scena e GLB, con modello caricato da Storage.
- Utente B non legge né modifica scene/GLB di A; senza login le richieste sono negate.
- Due finestre sulla stessa revisione: la seconda scrittura viene respinta.
- Un file oltre 100 MiB o con MIME non ammesso viene respinto anche dal server.
- Le regole museo/tenant sono verificate con emulatori e test dedicati.
- Sono configurati CORS, budget, quote e, dove opportuno, App Check.
- Logout e cambio utente svuotano/remontano lo stato privato del wrapper nel CMS.
- Nessun account di servizio è nel repository o nel bundle.

## Documentazione ufficiale

[Regole Firestore](https://firebase.google.com/docs/firestore/security/get-started)
[Regole Storage](https://firebase.google.com/docs/storage/security)
[Download web e CORS](https://firebase.google.com/docs/storage/web/download-files)
[Requisiti di fatturazione Storage](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
