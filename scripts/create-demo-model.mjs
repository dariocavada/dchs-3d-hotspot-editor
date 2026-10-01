// Original procedural lathe mesh. No external assets or third-party model license.
import { writeFileSync } from 'node:fs';
const profile = [[.02,0],[.02,.18],[.06,.30],[.15,.40],[.35,.55],[.65,.65],[.90,.66],[1.15,.59],[1.40,.37],[1.58,.30],[1.68,.36],[1.72,.39],[1.76,.38],[1.76,.33],[1.70,.30],[1.55,.265],[1.39,.33],[1.15,.55],[.90,.62],[.65,.60],[.35,.50],[.15,.34],[.08,.20],[.08,0]];
const n = 96, positions = [], normals = [], clay = [], paint = [];
for (let i = 0; i < profile.length; i++) {
  const [y, r] = profile[i]; const previous = profile[Math.max(0, i - 1)], next = profile[Math.min(profile.length - 1, i + 1)];
  const dy = next[0] - previous[0], dr = next[1] - previous[1]; const norm = Math.hypot(dy, dr) || 1;
  for (let j = 0; j <= n; j++) {
    const a = j / n * Math.PI * 2; positions.push(r * Math.cos(a), y, r * Math.sin(a)); normals.push(dy / norm * Math.cos(a), -dr / norm, dy / norm * Math.sin(a));
    if (i < profile.length - 1 && j < n) { const a = i * (n + 1) + j, b = a + n + 1; const target = i === 4 || i === 7 || i === 10 ? paint : clay; target.push(a, b, a + 1, a + 1, b, b + 1); }
  }
}
const blocks = [new Float32Array(positions), new Float32Array(normals), new Uint16Array(clay), new Uint16Array(paint)];
const views = []; let offset = 0;
const buffers = blocks.map((arr, index) => { const b = Buffer.from(arr.buffer); views.push({ buffer: 0, byteOffset: offset, byteLength: b.length, target: index < 2 ? 34962 : 34963 }); const padded = Buffer.alloc(Math.ceil(b.length / 4) * 4); b.copy(padded); offset += padded.length; return padded; });
const bin = Buffer.concat(buffers);
const json = { asset: { version: '2.0', generator: 'Model Hotspot Editor procedural fixture' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'Vaso dimostrativo originale' }],
  meshes: [{ primitives: [0, 1].map(i => ({ attributes: { POSITION: 0, NORMAL: 1 }, indices: i + 2, material: i })) }],
  materials: [ { name: 'Terracotta', pbrMetallicRoughness: { baseColorFactor: [.57,.29,.17,1], metallicFactor: 0, roughnessFactor: .8 }, doubleSided: true }, { name: 'Decorazione', pbrMetallicRoughness: { baseColorFactor: [.1,.2,.18,1], metallicFactor: 0, roughnessFactor: .7 }, doubleSided: true } ],
  buffers: [{ byteLength: bin.length }], bufferViews: views,
  accessors: [ { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: [-.66,.02,-.66], max: [.66,1.76,.66] }, { bufferView: 1, componentType: 5126, count: normals.length / 3, type: 'VEC3' }, { bufferView: 2, componentType: 5123, count: clay.length, type: 'SCALAR' }, { bufferView: 3, componentType: 5123, count: paint.length, type: 'SCALAR' } ] };
const text = Buffer.from(JSON.stringify(json)); const body = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32); text.copy(body);
const total = 12 + 8 + body.length + 8 + bin.length; const output = Buffer.alloc(total);
output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(total, 8);
output.writeUInt32LE(body.length, 12); output.writeUInt32LE(0x4e4f534a, 16); body.copy(output, 20);
const cursor = 20 + body.length; output.writeUInt32LE(bin.length, cursor); output.writeUInt32LE(0x004e4942, cursor + 4); bin.copy(output, cursor + 8);
writeFileSync(new URL('../demo/public/sample-vase.glb', import.meta.url), output);
console.log(`Wrote ${output.length} bytes, ${positions.length / 3} vertices.`);
