import type { CameraState, Hotspot, ModelAsset, SceneDocument, SurfaceHit } from '../types.js';
import { MAX_HOTSPOTS, parseCamera, parseScene, ValidationError } from './schema.js';
export function createScene(model: ModelAsset | null = null, title = 'Nuova esperienza 3D'): SceneDocument {
  return { schemaVersion: 1, id: crypto.randomUUID(), title, model: model ? { ...model } : null,
    hotspots: [], initialCamera: null, revision: 0, updatedAt: null };
}
export function addHotspot(s: SceneDocument, hit: SurfaceHit, camera: CameraState | null = null): SceneDocument {
  if (!s.model) throw new ValidationError('Carica prima un modello.');
  if (s.hotspots.length >= MAX_HOTSPOTS) throw new ValidationError(`Massimo ${MAX_HOTSPOTS} punti.`);
  const point: Hotspot = {
    id: crypto.randomUUID(), title: `Punto ${s.hotspots.length + 1}`, description: '',
    position: { ...hit.position }, normal: { ...hit.normal }, camera: parseCamera(camera),
    contentId: '', linkUrl: '', imageUrl: '', audioUrl: ''
  };
  return { ...s, hotspots: [...s.hotspots, point] };
}
/** Form edits can be temporarily incomplete. Full validation runs on save/import. */
export function patchHotspot(s: SceneDocument, pointId: string, patch: Partial<Hotspot>): SceneDocument {
  return { ...s, hotspots: s.hotspots.map(p => p.id === pointId ? { ...p, ...patch, id: p.id } : p) };
}
export function removeHotspot(s: SceneDocument, pointId: string): SceneDocument {
  return { ...s, hotspots: s.hotspots.filter(p => p.id !== pointId) };
}
export function moveHotspot(s: SceneDocument, pointId: string, delta: number): SceneDocument {
  const from = s.hotspots.findIndex(p => p.id === pointId);
  const to = from + Math.sign(delta);
  if (from < 0 || to < 0 || to >= s.hotspots.length) return s;
  const hotspots = [...s.hotspots]; const [item] = hotspots.splice(from, 1);
  hotspots.splice(to, 0, item!); return { ...s, hotspots };
}
export function importForModel(raw: unknown, current: SceneDocument): SceneDocument {
  const imported = parseScene(raw);
  if (!current.model || current.model.id !== imported.model?.id) throw new ValidationError('Carica prima lo stesso modello GLB usato dal JSON.');
  return { ...imported, id: current.id, model: current.model, revision: current.revision, updatedAt: current.updatedAt };
}
