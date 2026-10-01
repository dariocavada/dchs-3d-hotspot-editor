export { default as ModelViewer } from './components/ModelViewer.vue';
export { useModelSession } from './composables/useModelSession.js';
export { createScene, addHotspot, patchHotspot, removeHotspot, moveHotspot, importForModel } from './domain/actions.js';
export { parseScene, ValidationError, isSafeUrl } from './domain/schema.js';
export { inspectGlb, MAX_MODEL_BYTES } from './domain/glb.js';
export { ConflictError } from './domain/revision.js';
export type * from './types.js';
