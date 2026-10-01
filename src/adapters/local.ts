import type { LoadedScene, SaveRequest, SceneDocument, SceneRepository, SceneSummary } from '../types.js';
import { parseScene, ValidationError } from '../domain/schema.js';
import { inspectGlb } from '../domain/glb.js';
import { prepareSave } from '../domain/revision.js';
function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}
/** Local-only storage. Data belongs to this browser origin, not to an account. */
export function createLocalRepository(databaseName = 'model-hotspot-editor'): SceneRepository & { close(): void } {
  let connection: Promise<IDBDatabase> | null = null;
  function open(): Promise<IDBDatabase> {
    if (!connection) connection = new Promise((resolve, reject) => {
      const req = indexedDB.open(databaseName, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('scenes', { keyPath: 'id' });
        req.result.createObjectStore('assets', { keyPath: 'id' });
      };
      req.onsuccess = () => { req.result.onversionchange = () => req.result.close(); resolve(req.result); };
      req.onerror = () => { connection = null; reject(req.error); };
      req.onblocked = () => { connection = null; reject(new Error('Database locale bloccato da un’altra scheda.')); };
    });
    return connection;
  }
  return {
    async list(): Promise<SceneSummary[]> {
      const db = await open();
      const rows = await request<SceneDocument[]>(db.transaction('scenes').objectStore('scenes').getAll());
      return rows.map(parseScene).map(({ id, title, updatedAt, revision }) => ({ id, title, updatedAt, revision }))
        .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    },
    async load(id): Promise<LoadedScene | null> {
      const db = await open();
      const raw = await request<SceneDocument | undefined>(db.transaction('scenes').objectStore('scenes').get(id));
      if (!raw) return null;
      const document = parseScene(raw);
      if (!document.model) return { document };
      const asset = await request<{ id: string; blob: Blob } | undefined>(db.transaction('assets').objectStore('assets').get(document.model.id));
      if (!asset) throw new Error('Il modello non è più nel database locale. Reimporta il GLB.');
      return { document, blob: asset.blob };
    },
    async save({ document, blob, onProgress }: SaveRequest): Promise<SceneDocument> {
      const clean = parseScene(document);
      if (!clean.model) throw new ValidationError('Carica un modello prima di salvare.');
      if (blob) {
        const inspected = await inspectGlb(blob, clean.model.name);
        if (inspected.id !== clean.model.id || inspected.byteLength !== clean.model.byteLength) throw new ValidationError('Il file non corrisponde al modello della scena.');
      }
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['scenes', 'assets'], 'readwrite');
        const scenes = tx.objectStore('scenes'); const assets = tx.objectStore('assets');
        let saved: SceneDocument; let reason: unknown;
        const abort = (e: unknown) => { reason = e; tx.abort(); };
        const current = scenes.get(clean.id);
        current.onsuccess = () => {
          try {
            saved = prepareSave(clean, current.result ? parseScene(current.result) : null, new Date().toISOString());
            if (blob) { assets.put({ id: clean.model!.id, blob }); scenes.put(saved); }
            else {
              const existing = assets.get(clean.model!.id);
              existing.onsuccess = () => {
                if (!existing.result) abort(new Error('Manca il GLB. Caricalo prima del primo salvataggio.'));
                else scenes.put(saved);
              };
            }
          } catch (e) { abort(e); }
        };
        tx.oncomplete = () => { onProgress?.(1); resolve(saved); };
        tx.onabort = () => reject(reason ?? tx.error ?? new Error('Salvataggio locale annullato.'));
        tx.onerror = () => { reason ??= tx.error; };
      });
    },
    close() { void connection?.then(db => db.close()); connection = null; }
  };
}
