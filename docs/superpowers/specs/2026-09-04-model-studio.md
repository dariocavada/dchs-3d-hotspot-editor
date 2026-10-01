# Model Studio: specifica
Il progetto implementa il design approvato in conversazione: viewer model-viewer,
editor Vue 3/Vuetify 3, demo standalone, persistenza opzionale Firebase.

## Contratti
- Viewer senza Vuetify e senza Firebase. Editor importa il viewer.
- SceneDocument JSON versionato, coordinate in metri, angoli camera in radianti.
- GLB statici autosufficienti; hash SHA-256 associa punti e asset.
- Adapter load/list/save; save confronta revision e restituisce la revisione nuova.
- Demo locale con IndexedDB; Firebase usa Auth esistente, Firestore e Storage.
- Firebase non viene inizializzato dalla libreria.
- Dati testuali renderizzati come testo, non HTML; link limitati a HTTP(S).
- Modifiche esplicite, conferma prima di cambiare scena, avviso beforeunload.
- Import/export JSON non include il GLB. Il modello va caricato separatamente.

## Perimetro
Upload GLB, orbit/pan/zoom, hotspot, edit, reorder, remove, reposition, camera per punto,
anteprima, salvataggio/riapertura, libreria ESM e dichiarazioni TypeScript.
Non inclusi geometria/mesh editing, deformazioni animate, multiutente realtime,
pubblicazione ACL museale e localizzazione automatica. Nessun repository remoto creato.

## Accettazione
Test per schema, URL, hash GLB, immutabilità azioni, camera, gesti, revisioni.
Demo compilabile e test browser previsti. Le verifiche non eseguibili devono essere
segnalate nel report senza presentarne l'esito come positivo.
