<script lang="ts">
import { defineComponent, ref, type PropType } from 'vue';
import { VBtn, VTextField, VTextarea, VDialog, VCard, VCardTitle, VCardText, VCardActions, VSpacer } from 'vuetify/components';
import type { Hotspot } from '../types.js';
import { isSafeUrl } from '../domain/schema.js';
export default defineComponent({
  name: 'HotspotForm',
  components: { VBtn, VTextField, VTextarea, VDialog, VCard, VCardTitle, VCardText, VCardActions, VSpacer },
  props: { hotspot: { type: Object as PropType<Hotspot>, required: true }, disabled: Boolean },
  emits: ['patch', 'capture', 'reposition', 'remove'],
  setup(_, { emit }) {
    const confirmDelete = ref(false);
    return { confirmDelete, patch: (value: Partial<Hotspot>) => emit('patch', value),
      validUrl: (value: string) => isSafeUrl(value ?? '') || 'Usa un URL HTTPS, HTTP o /locale.',
      remove: () => { confirmDelete.value = false; emit('remove'); } };
  }
});
</script>
<template>
  <section class="se-hotspot-form">
    <v-text-field :model-value="hotspot.title" label="Titolo del punto" variant="outlined" density="comfortable" maxlength="160" :disabled="disabled" hide-details @update:model-value="patch({ title: String($event ?? '') })" />
    <v-textarea :model-value="hotspot.description" label="Racconta questo dettaglio" variant="outlined" density="comfortable" :rows="4" maxlength="5000" auto-grow :disabled="disabled" hide-details @update:model-value="patch({ description: String($event ?? '') })" />
    <div class="se-form-caption">POSIZIONE E INQUADRATURA</div>
    <div class="se-form-actions">
      <v-btn variant="outlined" size="small" :disabled="disabled" @click="$emit('reposition')">Riposiziona punto</v-btn>
      <v-btn variant="tonal" color="primary" size="small" :disabled="disabled" @click="$emit('capture')">Memorizza vista</v-btn>
    </div>
    <p class="se-form-help">{{ hotspot.camera ? 'Una vista è associata a questo punto.' : 'Ruota e avvicina il modello, poi memorizza la vista.' }}</p>
    <v-btn v-if="hotspot.camera" size="x-small" variant="text" :disabled="disabled" @click="patch({ camera: null })">Rimuovi vista associata</v-btn>
    <details class="se-form-media">
      <summary>Contenuto CMS e media</summary>
      <div class="se-form-media__fields">
        <v-text-field :model-value="hotspot.contentId" label="ID contenuto nel CMS" variant="outlined" density="compact" maxlength="256" :disabled="disabled" hide-details @update:model-value="patch({ contentId: String($event ?? '') })" />
        <v-text-field :model-value="hotspot.imageUrl" label="URL immagine" variant="outlined" density="compact" maxlength="2048" :rules="[validUrl]" :disabled="disabled" hide-details="auto" @update:model-value="patch({ imageUrl: String($event ?? '') })" />
        <v-text-field :model-value="hotspot.audioUrl" label="URL audio" variant="outlined" density="compact" maxlength="2048" :rules="[validUrl]" :disabled="disabled" hide-details="auto" @update:model-value="patch({ audioUrl: String($event ?? '') })" />
        <v-text-field :model-value="hotspot.linkUrl" label="URL approfondimento" variant="outlined" density="compact" maxlength="2048" :rules="[validUrl]" :disabled="disabled" hide-details="auto" @update:model-value="patch({ linkUrl: String($event ?? '') })" />
      </div>
    </details>
    <v-btn variant="text" color="error" size="small" :disabled="disabled" @click="confirmDelete = true">Elimina punto</v-btn>
    <v-dialog v-model="confirmDelete" max-width="400">
      <v-card><v-card-title>Eliminare questo punto?</v-card-title><v-card-text>Il punto e il suo testo saranno rimossi dalla scena corrente.</v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="confirmDelete = false">Annulla</v-btn><v-btn color="error" @click="remove">Elimina</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>
<style>
.se-hotspot-form { display: grid; gap: 16px; padding-top: 18px; }
.se-form-caption { font-size: 10px; font-weight: 700; color: #68756e; letter-spacing: .12em; margin-top: 3px; }
.se-form-actions { display: flex; flex-wrap: wrap; gap: 7px; }
.se-form-help { font-size: 12px; color: #63736a; line-height: 1.6; margin: -8px 0 0; }
.se-form-media { border-top: 1px solid #e7ebe6; border-bottom: 1px solid #e7ebe6; padding: 13px 0; }
.se-form-media summary { font-size: 13px; font-weight: 600; cursor: pointer; }
.se-form-media__fields { display: grid; gap: 15px; padding-top: 16px; }
</style>
