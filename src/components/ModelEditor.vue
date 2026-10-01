<script lang="ts">
import { computed, defineComponent, ref, watch, type PropType } from 'vue';
import { VAlert, VBtn, VTextField } from 'vuetify/components';
import ModelViewer from './ModelViewer.vue';
import HotspotForm from './HotspotForm.vue';
import { addHotspot, moveHotspot, patchHotspot, removeHotspot } from '../domain/actions.js';
import type { Hotspot, SceneDocument, SurfaceHit, ViewerHandle } from '../types.js';
export default defineComponent({
  name: 'ModelEditor', components: { ModelViewer, HotspotForm, VAlert, VBtn, VTextField },
  props: {
    modelValue: { type: Object as PropType<SceneDocument>, required: true },
    src: { type: String, default: '' }, disabled: Boolean
  },
  emits: ['update:modelValue', 'select'],
  setup(props, { emit }) {
    const viewer = ref<ViewerHandle>(); const selectedId = ref(''); const mode = ref<'view' | 'add' | 'move'>('view');
    const preview = ref(false); const ready = ref(false); const error = ref('');
    const active = computed(() => props.modelValue.hotspots.find(p => p.id === selectedId.value));
    const selectedIndex = computed(() => props.modelValue.hotspots.findIndex(p => p.id === selectedId.value));
    const update = (scene: SceneDocument) => { if (!props.disabled) emit('update:modelValue', scene); };
    function pick(point: Hotspot) { selectedId.value = point.id; emit('select', point); if (point.camera) viewer.value?.goToCamera(point.camera); }
    function place(hit: SurfaceHit) {
      if (props.disabled) return;
      error.value = '';
      try {
        if (mode.value === 'add') {
          const next = addHotspot(props.modelValue, hit, viewer.value?.captureCamera() ?? null);
          update(next); selectedId.value = next.hotspots[next.hotspots.length - 1]!.id;
        } else if (mode.value === 'move' && active.value) update(patchHotspot(props.modelValue, active.value.id, hit));
        mode.value = 'view';
      } catch (e) { error.value = e instanceof Error ? e.message : String(e); }
    }
    function patch(value: Partial<Hotspot>) { if (active.value) update(patchHotspot(props.modelValue, active.value.id, value)); }
    function capture() { const camera = viewer.value?.captureCamera(); if (camera) patch({ camera }); }
    function home() { const camera = viewer.value?.captureCamera(); if (camera) update({ ...props.modelValue, initialCamera: camera }); }
    function remove() {
      if (active.value) { update(removeHotspot(props.modelValue, active.value.id)); selectedId.value = ''; mode.value = 'view'; }
    }
    function move(delta: number) { if (active.value) update(moveHotspot(props.modelValue, active.value.id, delta)); }
    watch(() => props.src, () => { ready.value = false; mode.value = 'view'; selectedId.value = ''; preview.value = false; });
    watch(preview, () => { mode.value = 'view'; });
    return { viewer, selectedId, mode, preview, ready, error, active, selectedIndex, update, pick, place, patch, capture, home, remove, move };
  }
});
</script>
<template>
  <div class="se-editor">
    <div class="se-editor__toolbar">
      <div class="se-editor__mode">
        <button type="button" :class="{ active: !preview }" :disabled="disabled" @click="preview = false">Editor</button>
        <button type="button" :class="{ active: preview }" :disabled="disabled" @click="preview = true">Anteprima visitatore</button>
      </div>
      <div class="se-editor__tools" v-if="!preview">
        <v-btn variant="text" size="small" :disabled="disabled || !ready" @click="home">Imposta vista iniziale</v-btn>
        <v-btn color="primary" size="small" :disabled="disabled || !ready || modelValue.hotspots.length >= 100" @click="mode = mode === 'add' ? 'view' : 'add'">{{ mode === 'add' ? 'Annulla aggiunta' : '+ Aggiungi punto' }}</v-btn>
      </div>
    </div>
    <v-alert v-if="mode !== 'view'" type="info" variant="tonal" density="compact" class="mb-3" closable @click:close="mode = 'view'">
      {{ mode === 'move' ? 'Clicca sulla nuova posizione del punto.' : 'Ruota il modello e clicca sulla superficie per aggiungere un punto.' }}
    </v-alert>
    <v-alert v-if="error" type="error" density="compact" class="mb-3">{{ error }}</v-alert>
    <div class="se-editor__layout" :class="{ 'se-editor__layout--preview': preview }">
      <ModelViewer ref="viewer" :src="src" :alt="modelValue.title" :hotspots="modelValue.hotspots"
        :initial-camera="modelValue.initialCamera" :selected-id="selectedId" :placing="mode !== 'view'"
        :show-details="preview" :disabled="disabled" @select="pick" @surface-click="place"
        @load="ready = true" @error="ready = false" @cancel-placement="mode = 'view'">
        <template v-if="$slots['hotspot-content']" #hotspot-content="scope"><slot name="hotspot-content" v-bind="scope" /></template>
      </ModelViewer>
      <aside v-if="!preview" class="se-editor__inspector">
        <div class="se-editor__inspector-top"><span>LA TUA ESPERIENZA</span><span>{{ modelValue.hotspots.length }}/100 punti</span></div>
        <v-text-field :model-value="modelValue.title" label="Titolo dell’esperienza" maxlength="200" variant="outlined" density="compact" :disabled="disabled" hide-details @update:model-value="update({ ...modelValue, title: String($event ?? '') })" />
        <div class="se-editor__point-heading"><h3>Punti di interesse</h3><span>↘</span></div>
        <div v-if="!modelValue.hotspots.length" class="se-editor__empty-points">
          <span aria-hidden="true">＋</span><p>Ogni dettaglio ha una storia.</p><small>Usa “Aggiungi punto” per iniziare.</small>
        </div>
        <nav v-else class="se-editor__point-list" aria-label="Punti modificabili">
          <button v-for="(point, index) in modelValue.hotspots" :key="point.id" type="button"
            :class="{ selected: point.id === selectedId }" :disabled="disabled" :aria-pressed="point.id === selectedId" @click="mode = 'view'; pick(point)">
            <span class="se-editor__point-number">{{ String(index + 1).padStart(2, '0') }}</span><span>{{ point.title || 'Punto senza titolo' }}</span><span class="se-editor__point-arrow">↗</span>
          </button>
        </nav>
        <div v-if="active" class="se-editor__selected">
          <div class="se-editor__order"><span>MODIFICA PUNTO {{ selectedIndex + 1 }}</span>
            <div><v-btn size="x-small" variant="text" :disabled="disabled || selectedIndex === 0" aria-label="Sposta punto prima" @click="move(-1)">↑</v-btn><v-btn size="x-small" variant="text" :disabled="disabled || selectedIndex === modelValue.hotspots.length - 1" aria-label="Sposta punto dopo" @click="move(1)">↓</v-btn></div>
          </div>
          <HotspotForm :key="active.id" :hotspot="active" :disabled="disabled || !ready" @patch="patch" @capture="capture" @reposition="mode = 'move'" @remove="remove" />
        </div>
        <p v-else-if="modelValue.hotspots.length" class="se-editor__select-help">Seleziona un punto per modificarne contenuto e inquadratura.</p>
      </aside>
    </div>
  </div>
</template>
<style>
.se-editor { font-family: inherit; color: #22332c; }
.se-editor__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 0 0 20px; flex-wrap: wrap; }
.se-editor__mode { background: #edf0e9; padding: 4px; display: flex; border-radius: 9px; }
.se-editor__mode button { padding: 7px 13px; font: inherit; font-size: 12px; border-radius: 6px; color: #55645a; }
.se-editor__mode button.active { background: white; color: #234634; box-shadow: 0 1px 4px #26392812; }
.se-editor__tools { display: flex; gap: 7px; flex-wrap: wrap; }
.se-editor__layout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 24px; align-items: start; }
.se-editor__layout--preview { grid-template-columns: 1fr; }
.se-editor__inspector { border: 1px solid #e3e8df; border-radius: 14px; padding: 22px; background: #fff; min-height: 560px; }
.se-editor__inspector-top { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 20px; color: #6b766e; font-size: 10px; letter-spacing: .08em; }
.se-editor__point-heading { display: flex; justify-content: space-between; margin: 27px 0 15px; }
.se-editor__point-heading h3 { font-size: 15px; font-weight: 600; }
.se-editor__point-list { display: grid; gap: 6px; max-height: 218px; overflow: auto; }
.se-editor__point-list button { display: flex; align-items: center; gap: 11px; padding: 10px; background: #f6f7f3; border: 1px solid transparent; border-radius: 8px; text-align: left; font: inherit; font-size: 13px; color: #33463b; }
.se-editor__point-list button.selected { background: #eaf3ed; border-color: #b9d6c6; }
.se-editor__point-number { display: grid; place-items: center; flex: 0 0 26px; height: 26px; border-radius: 6px; background: white; font-size: 10px; color: #61756a; }
.se-editor__point-arrow { margin-left: auto; color: #8a9b8d; }
.se-editor__empty-points { text-align: center; background: #f8f9f5; padding: 30px 10px; border: 1px dashed #d9e1d3; border-radius: 10px; }
.se-editor__empty-points > span { font-size: 25px; color: #7b9788; }
.se-editor__empty-points p { margin: 8px 0; font-size: 13px; }
.se-editor__empty-points small { font-size: 11px; color: #798679; }
.se-editor__selected { margin-top: 23px; padding-top: 17px; border-top: 1px solid #e8ece5; }
.se-editor__order { display: flex; align-items: center; justify-content: space-between; font-size: 10px; letter-spacing: .09em; color: #748073; }
.se-editor__select-help { font-size: 12px; color: #6b776c; line-height: 1.7; margin-top: 20px; }
@media(max-width: 1000px) { .se-editor__layout { grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; } .se-editor__inspector { padding: 18px; } }
@media(max-width: 780px) { .se-editor__layout { grid-template-columns: 1fr; } .se-editor__inspector { min-height: auto; } }
</style>
