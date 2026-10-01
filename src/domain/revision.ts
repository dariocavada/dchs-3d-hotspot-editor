import type { SceneDocument } from '../types.js';
import { parseScene } from './schema.js';
export class ConflictError extends Error {
  name = 'ConflictError';
  constructor() { super('La scena è stata modificata o eliminata altrove. Esporta il JSON locale prima di ricaricare la versione salvata.'); }
}
export function prepareSave(next: SceneDocument, current: SceneDocument | null, now: string): SceneDocument {
  const clean = parseScene(next);
  if (current ? current.id !== clean.id || current.revision !== clean.revision : clean.revision !== 0) throw new ConflictError();
  return { ...clean, revision: clean.revision + 1, updatedAt: now };
}
