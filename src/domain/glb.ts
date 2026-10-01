import type { ModelAsset } from '../types.js';
import { ValidationError } from './schema.js';
export const MAX_MODEL_BYTES = 100 * 1024 * 1024;
/** Header and JSON dependency checks, not a complete glTF structural validator. */
export async function inspectGlb(blob: Blob, name: string): Promise<ModelAsset> {
  if (!/\.glb$/i.test(name)) throw new ValidationError('Seleziona un file .glb.');
  if (blob.size > MAX_MODEL_BYTES) throw new ValidationError('GLB troppo grande: massimo 100 MiB.');
  if (blob.size < 20) throw new ValidationError('File GLB troppo corto o non valido.');
  const bytes = await blob.arrayBuffer(); const v = new DataView(bytes);
  if (v.getUint32(0, true) !== 0x46546c67 || v.getUint32(4, true) !== 2) throw new ValidationError('Il file non è un GLB versione 2.');
  if (v.getUint32(8, true) !== bytes.byteLength) throw new ValidationError('Lunghezza GLB incoerente.');
  let offset = 12; let document: Record<string, unknown> | null = null;
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) throw new ValidationError('Chunk GLB incompleto.');
    const length = v.getUint32(offset, true); const type = v.getUint32(offset + 4, true);
    if (length % 4 || offset + 8 + length > bytes.byteLength) throw new ValidationError('Lunghezza chunk GLB non valida.');
    if (offset === 12 && type !== 0x4e4f534a) throw new ValidationError('Manca il chunk JSON del GLB.');
    if (type === 0x4e4f534a) {
      if (document) throw new ValidationError('Chunk JSON GLB duplicato.');
      try { document = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, offset + 8, length))); }
      catch { throw new ValidationError('JSON del GLB non valido.'); }
    }
    offset += 8 + length;
  }
  if (!document || typeof document !== 'object' || (document.asset as { version?: string } | undefined)?.version !== '2.0') throw new ValidationError('Asset GLB 2.0 non valido.');
  for (const key of ['buffers', 'images']) {
    const entries = document[key];
    if (Array.isArray(entries) && entries.some(e => typeof e?.uri === 'string' && !e.uri.startsWith('data:'))) {
      throw new ValidationError('Il GLB contiene risorse esterne. Esporta un GLB autosufficiente con texture incorporate.');
    }
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
  return { id: hash, name: name.slice(0, 255), byteLength: blob.size };
}
