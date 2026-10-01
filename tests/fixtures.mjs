export const model = { id: 'a'.repeat(64), name: 'test.glb', byteLength: 100 };
export const camera = { orbit: { theta: .3, phi: 1.1, radius: 4 }, target: { x: 0, y: 1, z: 0 }, fieldOfView: 30 };
export const hit = { position: { x: 1, y: 2, z: 3 }, normal: { x: 0, y: 0, z: 1 } };
export const hotspot = () => ({ id: 'p1', title: 'Bordo', description: '', ...structuredClone(hit), camera: null, contentId: '', linkUrl: '', imageUrl: '', audioUrl: '' });
export const scene = () => ({ schemaVersion: 1, id: 's1', title: 'Vaso', model: { ...model }, hotspots: [hotspot()], initialCamera: null, revision: 0, updatedAt: null });
export function glb(json = { asset: { version: '2.0' }, scenes: [{ nodes: [] }], scene: 0 }) {
  const raw = new TextEncoder().encode(JSON.stringify(json));
  const n = Math.ceil(raw.length / 4) * 4;
  const bytes = new Uint8Array(20 + n);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, bytes.length, true);
  view.setUint32(12, n, true); view.setUint32(16, 0x4e4f534a, true);
  bytes.fill(32, 20); bytes.set(raw, 20);
  return new Blob([bytes]);
}
