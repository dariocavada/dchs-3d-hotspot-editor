<script lang="ts">
import { computed, defineComponent, nextTick, onMounted, ref, watch, type PropType } from 'vue';
import type { CameraState, Hotspot, SurfaceHit, Vector3 } from '../types.js';
import { isSafeUrl } from '../domain/schema.js';
import { TapTracker } from '../domain/gesture.js';
export interface ModelElement extends HTMLElement {
  loaded: boolean;
  cameraOrbit: string; cameraTarget: string; fieldOfView: string;
  getCameraOrbit(): { theta: number; phi: number; radius: number };
  getCameraTarget(): Vector3; getFieldOfView(): number;
  positionAndNormalFromPoint(x: number, y: number): SurfaceHit | null;
  updateHotspot(config: { name: string; position: string; normal: string }): void;
}
const positionText = (v: Vector3) => `${v.x}m ${v.y}m ${v.z}m`;
const normalText = (v: Vector3) => `${v.x} ${v.y} ${v.z}`;
export default defineComponent({
  name: 'ModelViewer',
  props: {
    src: { type: String, default: '' },
    alt: { type: String, default: 'Modello 3D interattivo' },
    hotspots: { type: Array as PropType<Hotspot[]>, default: () => [] },
    selectedId: { type: String, default: '' },
    initialCamera: { type: Object as PropType<CameraState | null>, default: null },
    placing: { type: Boolean, default: false },
    showDetails: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false }
  },
  emits: ['select', 'update:selectedId', 'surface-click', 'load', 'error', 'cancel-placement'],
  setup(props, { emit, expose }) {
    const element = ref<ModelElement>(); const ready = ref(false); const failure = ref('');
    const progress = ref(0); const selected = ref(props.selectedId);
    const active = computed(() => props.hotspots.find(p => p.id === selected.value));
    const tap = new TapTracker();
    function goToCamera(camera: CameraState) {
      const el = element.value; if (!el || !ready.value) return;
      el.cameraOrbit = `${camera.orbit.theta}rad ${camera.orbit.phi}rad ${camera.orbit.radius}m`;
      el.cameraTarget = positionText(camera.target); el.fieldOfView = `${camera.fieldOfView}deg`;
    }
    function captureCamera(): CameraState | null {
      const el = element.value; if (!el || !ready.value) return null;
      const { theta, phi, radius } = el.getCameraOrbit(); const { x, y, z } = el.getCameraTarget();
      return { orbit: { theta, phi, radius }, target: { x, y, z }, fieldOfView: el.getFieldOfView() };
    }
    function resetCamera() {
      if (props.initialCamera) return goToCamera(props.initialCamera);
      const el = element.value; if (!el || !ready.value) return;
      el.cameraOrbit = '0deg 75deg 105%'; el.cameraTarget = 'auto auto auto'; el.fieldOfView = 'auto';
    }
    function selectPoint(point: Hotspot) {
      if (props.disabled || props.placing) return;
      selected.value = point.id; emit('update:selectedId', point.id); emit('select', point);
      if (point.camera) goToCamera(point.camera);
    }
    function onDown(e: PointerEvent) {
      if (e.composedPath().some(n => n instanceof HTMLElement && n.hasAttribute('data-hotspot'))) { tap.cancel(); return; }
      tap.down(e);
    }
    function onUp(e: PointerEvent) {
      if (!tap.up(e) || !props.placing || props.disabled || !ready.value) return;
      // model-viewer expects viewport client coordinates; it subtracts its own rect.
      const hit = element.value?.positionAndNormalFromPoint(e.clientX, e.clientY);
      if (hit) emit('surface-click', { position: { ...hit.position }, normal: { ...hit.normal } });
    }
    async function syncHotspots() {
      await nextTick(); const el = element.value;
      if (!el?.updateHotspot || !ready.value) return;
      // The underlying Web Component does not observe data-position mutations.
      for (const p of props.hotspots) el.updateHotspot({ name: `hotspot-${p.id}`, position: positionText(p.position), normal: normalText(p.normal) });
    }
    function onLoad() { ready.value = true; failure.value = ''; progress.value = 1; void syncHotspots(); resetCamera(); emit('load'); }
    function onError() { ready.value = false; failure.value = 'Impossibile caricare il modello. Verifica GLB, connessione e supporto WebGL.'; emit('error', failure.value); }
    function onProgress(event: Event) { progress.value = (event as CustomEvent<{ totalProgress: number }>).detail.totalProgress; }
    watch(() => props.src, () => { ready.value = false; failure.value = ''; progress.value = 0; tap.cancel(); });
    watch(() => props.selectedId, value => { selected.value = value; });
    watch(() => props.hotspots, () => {
      if (selected.value && !props.hotspots.some(p => p.id === selected.value)) selected.value = '';
      void syncHotspots();
    }, { deep: true });
    watch(() => props.initialCamera, () => { if (ready.value) resetCamera(); }, { deep: true });
    onMounted(async () => {
      try {
        if (!customElements.get('model-viewer')) await import('@google/model-viewer');
        await nextTick(); if (element.value?.loaded) onLoad();
      } catch { failure.value = 'Motore 3D non disponibile. Verifica l’installazione di @google/model-viewer.'; emit('error', failure.value); }
    });
    expose({ captureCamera, goToCamera, resetCamera });
    return { element, ready, failure, progress, active, selected, positionText, normalText, isSafeUrl,
      onLoad, onError, onProgress, selectPoint, onDown, onUp, onMove: (e: PointerEvent) => tap.move(e),
      cancelPointer: () => tap.cancel(), resetCamera, cancelPlacement: () => emit('cancel-placement') };
  }
});
</script>

<template>
  <section class="se-viewer" :class="{ 'se-viewer--placing': placing }" :aria-busy="!!src && !ready && !failure">
    <div class="se-viewer__stage">
      <model-viewer v-if="src" :key="src" ref="element" :src="src" :alt="alt"
        camera-controls shadow-intensity="1" shadow-softness="1" exposure="1"
        interaction-prompt="none" loading="eager" touch-action="pan-y" disable-tap
        @load="onLoad" @error="onError" @progress="onProgress"
        @pointerdown.capture="onDown" @pointermove.capture="onMove" @pointerup.capture="onUp"
        @pointercancel.capture="cancelPointer" @pointerleave="cancelPointer" @keydown.esc="cancelPlacement">
        <div slot="progress-bar"></div>
        <button v-for="(point, index) in hotspots" :key="point.id" type="button"
          :slot="`hotspot-${point.id}`" :data-position="positionText(point.position)"
          :data-normal="normalText(point.normal)" data-visibility-attribute="visible" data-hotspot
          class="se-hotspot" :class="{ 'se-hotspot--active': point.id === selected }"
          :aria-label="`${index + 1}. ${point.title}`" :aria-pressed="point.id === selected"
          :disabled="disabled || placing" @click.stop="selectPoint(point)">{{ index + 1 }}</button>
      </model-viewer>
      <div v-else class="se-viewer__empty">
        <span class="se-viewer__empty-symbol" aria-hidden="true">◇</span>
        <h3>Il tuo prossimo oggetto da raccontare.</h3>
        <p>Carica un GLB o apri il modello dimostrativo.</p>
      </div>
      <div v-if="src && !ready && !failure" class="se-viewer__loading" role="status">
        <span>Caricamento modello {{ Math.round(progress * 100) }}%</span>
        <progress :value="progress" max="1" aria-label="Caricamento modello"></progress>
      </div>
      <div v-if="failure" class="se-viewer__failure" role="alert">{{ failure }}</div>
      <div v-if="ready" class="se-viewer__topline">
        <span class="se-viewer__badge">{{ placing ? 'CLICCA SULLA SUPERFICIE' : 'ESPLORA IN 3D' }}</span>
        <button class="se-viewer__reset" type="button" :disabled="disabled" @click="resetCamera">Vista iniziale ↗</button>
      </div>
      <div v-if="ready" class="se-viewer__hint">{{ placing ? 'Puoi ancora ruotare il modello. Un clic breve aggiunge il punto.' : 'Trascina per ruotare · Scorri per lo zoom · Due dita per spostare' }}</div>
    </div>
    <div v-if="showDetails && hotspots.length" class="se-viewer__details">
      <nav class="se-viewer__point-nav" aria-label="Punti del modello">
        <button v-for="(point, index) in hotspots" :key="point.id" type="button"
          :class="{ 'is-active': point.id === selected }" :disabled="disabled"
          :aria-pressed="point.id === selected" @click="selectPoint(point)">{{ index + 1 }}. {{ point.title }}</button>
      </nav>
      <article v-if="active" class="se-viewer__article">
        <slot name="hotspot-content" :hotspot="active">
          <img v-if="active.imageUrl && isSafeUrl(active.imageUrl)" :src="active.imageUrl" :alt="active.title" loading="lazy" referrerpolicy="no-referrer" />
          <h3>{{ active.title }}</h3><p>{{ active.description }}</p>
          <audio v-if="active.audioUrl && isSafeUrl(active.audioUrl)" :key="active.audioUrl" :src="active.audioUrl" controls preload="none"></audio>
          <a v-if="active.linkUrl && isSafeUrl(active.linkUrl)" :href="active.linkUrl" target="_blank" rel="noopener noreferrer">Approfondisci ↗</a>
        </slot>
      </article>
      <p v-else class="se-viewer__choose">Seleziona un punto per scoprirne il contenuto.</p>
    </div>
  </section>
</template>

<style>
.se-viewer { --se-accent: #1b6655; --se-ink: #20312e; font-family: inherit; color: var(--se-ink); width: 100%; }
.se-viewer__stage { position: relative; min-height: 440px; height: var(--se-viewer-height, 560px); overflow: hidden; border-radius: 14px; background: radial-gradient(ellipse at 50% 48%, #faf9f5 0%, #ebece7 70%, #e4e7e2 100%); }
.se-viewer model-viewer { width: 100%; height: 100%; --poster-color: transparent; }
.se-viewer--placing model-viewer { cursor: crosshair; }
.se-viewer__empty, .se-viewer__loading, .se-viewer__failure { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px; text-align: center; gap: 14px; }
.se-viewer__empty h3 { font-size: 22px; font-weight: 500; }
.se-viewer__empty p { font-size: 14px; color: #52615c; }
.se-viewer__empty-symbol { font-size: 76px; line-height: 1; font-weight: 200; color: #728b80; }
.se-viewer__loading { pointer-events: none; background: #eef0eac7; font-size: 14px; }
.se-viewer__loading progress { width: 180px; accent-color: var(--se-accent); }
.se-viewer__failure { color: #8a2929; background: #fff7f0eb; }
.se-viewer__topline { position: absolute; top: 18px; left: 20px; right: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; pointer-events: none; }
.se-viewer__badge { font-size: 10px; letter-spacing: .16em; font-weight: 700; color: #44594f; background: #ffffffe0; border: 1px solid #d9e1d6; border-radius: 30px; padding: 7px 11px; }
.se-viewer__reset { pointer-events: auto; font: inherit; font-size: 12px; border: 1px solid #d2dacf; border-radius: 8px; background: #ffffffe5; padding: 8px 10px; cursor: pointer; color: var(--se-ink); }
.se-viewer__hint { position: absolute; bottom: 18px; left: 16px; right: 16px; text-align: center; color: #56655e; font-size: 11px; pointer-events: none; }
.se-hotspot { background: white; color: var(--se-ink); border: 2px solid white; outline: 1px solid #33554940; border-radius: 50%; width: 36px; height: 36px; font: 600 12px system-ui, sans-serif; cursor: pointer; box-shadow: 0 4px 18px #1c2e2522; transition: opacity .2s, background .2s; }
.se-hotspot:not([data-visible]) { opacity: .25; }
.se-hotspot--active { background: var(--se-accent); color: white; }
.se-hotspot:focus-visible, .se-viewer button:focus-visible { outline: 3px solid #43846e; outline-offset: 3px; }
.se-viewer__details { padding: 18px 4px; }
.se-viewer__point-nav { display: flex; gap: 8px; flex-wrap: wrap; }
.se-viewer__point-nav button { font: inherit; font-size: 13px; background: white; color: var(--se-ink); border: 1px solid #d9e2dc; border-radius: 8px; padding: 9px 13px; cursor: pointer; }
.se-viewer__point-nav button.is-active { background: var(--se-accent); color: white; border-color: var(--se-accent); }
.se-viewer__article { padding-top: 20px; max-width: 760px; }
.se-viewer__article h3 { font-size: 22px; margin: 0 0 10px; }
.se-viewer__article p { white-space: pre-wrap; line-height: 1.7; font-size: 15px; margin: 0 0 16px; }
.se-viewer__article img { max-width: 100%; max-height: 260px; border-radius: 12px; object-fit: contain; margin-bottom: 14px; }
.se-viewer__article audio { width: 100%; margin-bottom: 15px; }
.se-viewer__article a { display: block; color: var(--se-accent); font-size: 14px; }
.se-viewer__choose { font-size: 14px; margin: 20px 0 0; color: #68746d; }
@media (max-width: 640px) { .se-viewer__stage { min-height: 360px; height: var(--se-viewer-mobile-height, 430px); } .se-viewer__hint { font-size: 10px; } }
</style>
