import type { CameraState, Hotspot, ModelAsset, SceneDocument, Vector3 } from '../types.js';
export const MAX_HOTSPOTS = 100;
export const MAX_DOCUMENT_BYTES = 700 * 1024;
export class ValidationError extends Error { name = 'ValidationError'; }
function fail(message: string): never { throw new ValidationError(message); }
function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${path}: oggetto richiesto.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, path: string, max: number, fallback?: string): string {
  const result = value === undefined ? fallback : value;
  if (typeof result !== 'string' || result.length > max) fail(`${path}: testo troppo lungo o non valido (max ${max}).`);
  return result;
}
function number(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e12) fail(`${path}: numero non valido.`);
  return value;
}
function id(value: unknown, path: string): string {
  const result = text(value, path, 128);
  if (!/^[a-zA-Z0-9][\w-]{0,127}$/.test(result)) fail(`${path}: identificativo non valido.`);
  return result;
}
function vector(value: unknown, path: string): Vector3 {
  const v = object(value, path);
  return { x: number(v.x, `${path}.x`), y: number(v.y, `${path}.y`), z: number(v.z, `${path}.z`) };
}
export function isSafeUrl(value: string): boolean {
  if (!value) return true;
  if (value !== value.trim() || /[\\\u0000-\u0020\u007f]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password;
  } catch { return false; }
}
function url(value: unknown, path: string): string {
  const s = text(value, path, 2048, '');
  if (!isSafeUrl(s)) fail(`${path}: URL non sicuro. Usa HTTPS, HTTP o un percorso /locale.`);
  return s;
}
export function parseCamera(value: unknown): CameraState | null {
  if (value == null) return null;
  const c = object(value, 'camera'); const o = object(c.orbit, 'camera.orbit');
  const theta = number(o.theta, 'camera.theta'); const phi = number(o.phi, 'camera.phi');
  const radius = number(o.radius, 'camera.radius'); const fov = number(c.fieldOfView, 'camera.fieldOfView');
  if (radius <= 0 || phi < 0 || phi > Math.PI || fov <= 0 || fov >= 180) fail('camera: parametri fuori intervallo.');
  return { orbit: { theta, phi, radius }, target: vector(c.target, 'camera.target'), fieldOfView: fov };
}
function asset(value: unknown): ModelAsset | null {
  if (value == null) return null;
  const a = object(value, 'model'); const hash = text(a.id, 'model.id', 64);
  if (!/^[a-f0-9]{64}$/.test(hash)) fail('model.id: hash SHA-256 non valido.');
  const bytes = number(a.byteLength, 'model.byteLength');
  if (!Number.isInteger(bytes) || bytes <= 0 || bytes > 100 * 1024 * 1024) fail('Dimensione del modello non valida.');
  return { id: hash, name: text(a.name, 'model.name', 255), byteLength: bytes };
}
function hotspot(value: unknown): Hotspot {
  const p = object(value, 'hotspot'); const normal = vector(p.normal, 'normal');
  if (Math.hypot(normal.x, normal.y, normal.z) < 1e-8) fail('normal: vettore nullo.');
  return {
    id: id(p.id, 'hotspot.id'), title: text(p.title, 'hotspot.title', 160),
    description: text(p.description, 'hotspot.description', 5000, ''),
    position: vector(p.position, 'position'), normal, camera: parseCamera(p.camera),
    contentId: text(p.contentId, 'contentId', 256, ''), linkUrl: url(p.linkUrl, 'linkUrl'),
    imageUrl: url(p.imageUrl, 'imageUrl'), audioUrl: url(p.audioUrl, 'audioUrl')
  };
}
/** Canonicalizes untrusted JSON; strips unknown fields and all undefined values. */
export function parseScene(input: unknown): SceneDocument {
  const s = object(input, 'scene');
  if (s.schemaVersion !== 1) fail('Versione dello schema non supportata.');
  if (!Array.isArray(s.hotspots) || s.hotspots.length > MAX_HOTSPOTS) fail(`Massimo ${MAX_HOTSPOTS} punti per scena.`);
  const hotspots = s.hotspots.map(hotspot);
  if (new Set(hotspots.map(p => p.id)).size !== hotspots.length) fail('Identificativo hotspot duplicato.');
  const model = asset(s.model);
  if (!model && hotspots.length) fail('I punti richiedono un modello.');
  const revision = number(s.revision, 'revision');
  if (!Number.isSafeInteger(revision) || revision < 0) fail('Revisione non valida.');
  let updatedAt: string | null = null;
  if (s.updatedAt != null) {
    updatedAt = text(s.updatedAt, 'updatedAt', 40);
    if (Number.isNaN(Date.parse(updatedAt))) fail('updatedAt: data non valida.');
  }
  const result: SceneDocument = {
    schemaVersion: 1, id: id(s.id, 'scene.id'), title: text(s.title, 'scene.title', 200),
    model, hotspots, initialCamera: parseCamera(s.initialCamera), revision, updatedAt
  };
  if (new TextEncoder().encode(JSON.stringify(result)).length > MAX_DOCUMENT_BYTES) fail('Documento troppo grande: limite 700 KiB.');
  return result;
}
