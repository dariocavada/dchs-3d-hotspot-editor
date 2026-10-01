import { computed, onBeforeUnmount, ref, shallowRef, toValue, type MaybeRefOrGetter } from 'vue';
import type { SceneRepository } from '../types.js';
import { createScene, importForModel } from '../domain/actions.js';
import { inspectGlb } from '../domain/glb.js';
import { MAX_DOCUMENT_BYTES, parseScene } from '../domain/schema.js';
/** UI-independent orchestration; the repository is injected by the host. */
export function useModelSession(repository: MaybeRefOrGetter<SceneRepository>) {
  const document = shallowRef(createScene());
  const modelUrl = ref(''); const busy = ref(false); const progress = ref(0); const error = ref('');
  const modelBlob = shallowRef<Blob>();
  let pendingBlob: Blob | undefined;
  let ownedUrl = '';
  const baseline = ref(JSON.stringify(document.value));
  const dirty = computed(() => JSON.stringify(document.value) !== baseline.value);
  function releaseUrl() { if (ownedUrl) URL.revokeObjectURL(ownedUrl); ownedUrl = ''; }
  function setSource(blob?: Blob, url?: string) {
    releaseUrl(); modelBlob.value = blob;
    if (blob) { ownedUrl = URL.createObjectURL(blob); modelUrl.value = ownedUrl; }
    else modelUrl.value = url ?? '';
  }
  async function run(action: () => Promise<void>): Promise<boolean> {
    if (busy.value) return false;
    busy.value = true; error.value = ''; progress.value = 0;
    try { await action(); return true; }
    catch (e) { error.value = e instanceof Error ? e.message : String(e); return false; }
    finally { busy.value = false; }
  }
  function reset() {
    if (busy.value) throw new Error('Attendi la conclusione dell’operazione corrente.');
    releaseUrl(); modelUrl.value = ''; modelBlob.value = undefined; pendingBlob = undefined;
    document.value = createScene(); baseline.value = JSON.stringify(document.value); error.value = '';
  }
  async function openFile(file: File) {
    return run(async () => {
      const model = await inspectGlb(file, file.name);
      setSource(file); pendingBlob = file;
      document.value = createScene(model, file.name.replace(/\.glb$/i, ''));
      baseline.value = ''; // A new asset has not yet been persisted.
    });
  }
  async function load(id: string) {
    return run(async () => {
      const loaded = await toValue(repository).load(id);
      if (!loaded) throw new Error('Scena non trovata.');
      const clean = parseScene(loaded.document);
      if (clean.model && !loaded.blob && !loaded.url) throw new Error('Il connettore non ha restituito il modello.');
      setSource(loaded.blob, loaded.url); pendingBlob = undefined;
      document.value = clean; baseline.value = JSON.stringify(clean);
    });
  }
  async function save() {
    return run(async () => {
      const snapshot = parseScene(document.value);
      const saved = await toValue(repository).save({ document: snapshot, blob: pendingBlob, onProgress: n => { progress.value = n; } });
      pendingBlob = undefined;
      // Preserve host edits made while a save was in flight.
      document.value = JSON.stringify(document.value) === JSON.stringify(snapshot)
        ? saved : { ...document.value, revision: saved.revision, updatedAt: saved.updatedAt };
      baseline.value = JSON.stringify(saved);
    });
  }
  async function importJson(file: File) {
    return run(async () => {
      if (file.size > MAX_DOCUMENT_BYTES) throw new Error('JSON troppo grande (massimo 700 KiB).');
      document.value = importForModel(JSON.parse(await file.text()), document.value);
    });
  }
  function exportJson() { return JSON.stringify(parseScene(document.value), null, 2); }
  onBeforeUnmount(releaseUrl);
  return { document, modelUrl, modelBlob, busy, progress, error, dirty, openFile, load, save, reset, importJson, exportJson };
}
