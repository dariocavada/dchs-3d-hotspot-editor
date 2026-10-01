# API pubblica

## ModelViewer

Import: `model-hotspot-editor`.

| Prop | Tipo | Default |
| --- | --- | --- |
| src | string | stringa vuota |
| alt | string | Modello 3D interattivo |
| hotspots | Hotspot[] | [] |
| selectedId | string | stringa vuota |
| initialCamera | CameraState oppure null | null |
| placing | boolean | false |
| showDetails | boolean | true |
| disabled | boolean | false |

Eventi: `select(Hotspot)`, `update:selectedId(string)`, `surface-click(SurfaceHit)`,
`load()`, `error(string)`, `cancel-placement()`.
Slot: `hotspot-content`, con proprietà `hotspot`.
Metodi esposti tramite ref: `captureCamera()`, `goToCamera(camera)`, `resetCamera()`.

Per le dimensioni usa CSS custom properties sul wrapper:

```css
.museum-object { --se-viewer-height: 640px; --se-viewer-mobile-height: 440px; }
```

Gli hotspot posteriori sono attenuati secondo l’orientamento, non nascosti sulla base
di una prova completa di occlusione. Il default non riproduce animazioni del GLB.

## ModelEditor

Import: `model-hotspot-editor/editor`.
Props: `modelValue: SceneDocument`, `src: string`, `disabled: boolean`.
Eventi: `update:modelValue(SceneDocument)`, `select(Hotspot)`.
Slot: `hotspot-content`, inoltrato al viewer nella modalità anteprima.

Il componente non salva da solo, non inizializza Firebase e non installa Vuetify.
Emette un nuovo documento invece di modificare il prop in-place.
La serializzazione e il controllo completo dello schema avvengono al salvataggio.

## useModelSession(repository)

Import: `model-hotspot-editor`.
Accetta una `SceneRepository` oppure un ref/getter che restituisce il repository.
Va chiamato in `setup()`: registra la pulizia degli URL temporanei su unmount.

Espone ref: `document`, `modelUrl`, `modelBlob`, `busy`, `progress`, `error`, `dirty`.
Espone metodi:

- `openFile(File): Promise<boolean>`: valida GLB, crea nuova scena e URL locale.
- `load(id): Promise<boolean>`: carica documento e modello dall’adapter.
- `save(): Promise<boolean>`: salva, aggiorna revisione e stato dirty.
- `importJson(File): Promise<boolean>`: importa sul modello attualmente caricato.
- `exportJson(): string`: restituisce JSON validato; può lanciare un errore.
- `reset(): void`: svuota la sessione; non va invocato mentre busy è true.

I metodi asincroni gestiti restituiscono false e valorizzano `error` in caso di
problemi. Non scartare l’esito pensando che una Promise risolta significhi sempre
salvataggio riuscito. L’esempio controlla `if (await save())`.

Se cambi il repository, non migri automaticamente i dati. Svuota la sessione o
carica esplicitamente una scena del nuovo repository. Per spostare un progetto,
esporta GLB e JSON, cambia repository, carica il GLB, importa il JSON e salva.

## SceneRepository

```ts
interface SceneRepository {
  list(): Promise<SceneSummary[]>;
  load(id: string): Promise<LoadedScene | null>;
  save(request: {
    document: SceneDocument;
    blob?: Blob;
    onProgress?: (fraction: number) => void;
  }): Promise<SceneDocument>;
}
```

`LoadedScene` contiene `document` e un `blob` o un `url` per il modello.
Il documento non contiene l’URL temporaneo e rimane portabile.
`save` deve restituire la nuova revisione e rifiutare una revisione obsoleta.

`createLocalRepository(databaseName?)` è esportato da `/local`.
`createFirebaseRepository(options)` è esportato da `/firebase`.
Le opzioni Firebase sono descritte in `FIREBASE.md` e nei tipi del pacchetto.

## Errori

`ValidationError`: schema, URL, asset o dimensioni non validi.
`ConflictError`: il documento remoto non ha la revisione attesa.
Gli errori di rete/Auth/permessi del Firebase SDK sono restituiti dal connettore e
mostrati dalla sessione; il CMS può tradurli o inviarli al proprio sistema di logging.
Non includere credenziali o contenuti riservati nel logging pubblico.
