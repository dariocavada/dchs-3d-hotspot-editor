import { collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import { getBlob, getDownloadURL, getMetadata, ref, uploadBytesResumable, type FirebaseStorage } from 'firebase/storage';
import type { SceneDocument, SceneRepository } from '../types.js';
import { parseScene, ValidationError } from '../domain/schema.js';
import { prepareSave } from '../domain/revision.js';
import { inspectGlb, MAX_MODEL_BYTES } from '../domain/glb.js';
export interface FirebaseRepositoryOptions {
  firestore: Firestore;
  storage: FirebaseStorage;
  /** Read the UID from the host CMS's existing Auth instance. */
  getUserId: () => string | null | undefined;
  paths?: (uid: string) => { collection: string; storagePrefix: string };
  /** blob respects authenticated reads; url exposes a reusable download token. */
  downloadMode?: 'blob' | 'url';
}
function safeSegment(value: string): string {
  if (!value || value.length > 128 || /[\/\\]/.test(value) || value === '.' || value === '..') throw new ValidationError('Identificativo Firebase non valido.');
  return value;
}
export function createFirebaseRepository(options: FirebaseRepositoryOptions): SceneRepository {
  function context() {
    const raw = options.getUserId();
    if (!raw) throw new Error('Accedi con Firebase prima di caricare o salvare.');
    const uid = safeSegment(raw);
    const paths = options.paths?.(uid) ?? { collection: `users/${uid}/modelScenes`, storagePrefix: `users/${uid}/models` };
    if (paths.collection.split('/').length % 2 !== 1 || !paths.storagePrefix || /(^\/|\/$|\/\/)/.test(paths.storagePrefix)) throw new Error('Percorsi Firebase non validi.');
    return { uid, ...paths };
  }
  function requireSameUser(uid: string) {
    if (options.getUserId() !== uid) throw new Error('La sessione utente è cambiata durante l’operazione.');
  }
  return {
    async list() {
      const ctx = context();
      const result = await getDocs(query(collection(options.firestore, ctx.collection), orderBy('updatedAt', 'desc'), limit(100)));
      requireSameUser(ctx.uid);
      return result.docs.map(row => {
        const s = parseScene(row.data().scene);
        return { id: s.id, title: s.title, revision: s.revision, updatedAt: s.updatedAt };
      });
    },
    async load(id) {
      const ctx = context();
      const row = await getDoc(doc(options.firestore, ctx.collection, safeSegment(id)));
      if (!row.exists()) return null;
      const document = parseScene(row.data().scene);
      if (document.id !== id) throw new Error('Identificativo della scena incoerente.');
      if (!document.model) return { document };
      const asset = ref(options.storage, `${ctx.storagePrefix}/${document.model.id}.glb`);
      if (options.downloadMode === 'url') {
        const url = await getDownloadURL(asset); requireSameUser(ctx.uid); return { document, url };
      }
      const blob = await getBlob(asset, MAX_MODEL_BYTES); requireSameUser(ctx.uid);
      return { document, blob };
    },
    async save({ document, blob, onProgress }) {
      const ctx = context(); const clean = parseScene(document);
      if (!clean.model) throw new ValidationError('Carica un modello prima di salvare.');
      const asset = ref(options.storage, `${ctx.storagePrefix}/${clean.model.id}.glb`);
      if (blob) {
        const inspected = await inspectGlb(blob, clean.model.name);
        if (inspected.id !== clean.model.id || inspected.byteLength !== clean.model.byteLength) throw new ValidationError('GLB e hash della scena non corrispondono.');
        requireSameUser(ctx.uid);
        const task = uploadBytesResumable(asset, blob, {
          contentType: 'model/gltf-binary', customMetadata: { sha256: clean.model.id }
        });
        const unsubscribe = task.on('state_changed', snapshot => {
          onProgress?.(snapshot.totalBytes ? snapshot.bytesTransferred / snapshot.totalBytes : 0);
        });
        try { await task; } finally { unsubscribe(); }
      } else {
        // Never commit a document whose model was not uploaded to this adapter.
        const metadata = await getMetadata(asset);
        if (metadata.size !== clean.model.byteLength || metadata.customMetadata?.sha256 !== clean.model.id) throw new Error('Modello assente o non coerente in Storage. Ricarica il GLB.');
      }
      requireSameUser(ctx.uid);
      const target = doc(options.firestore, ctx.collection, clean.id);
      return runTransaction(options.firestore, async tx => {
        requireSameUser(ctx.uid);
        const previous = await tx.get(target);
        const saved: SceneDocument = prepareSave(clean, previous.exists() ? parseScene(previous.data().scene) : null, new Date().toISOString());
        tx.set(target, { scene: saved, ownerId: ctx.uid, revision: saved.revision, updatedAt: serverTimestamp() });
        return saved;
      });
    }
  };
}
