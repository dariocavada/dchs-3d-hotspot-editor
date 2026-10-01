<script setup lang="ts">
import { onMounted } from 'vue';
import { VAlert, VBtn } from 'vuetify/components';
import { ModelEditor } from 'model-hotspot-editor/editor';
import { useModelSession, type SceneDocument, type Hotspot } from 'model-hotspot-editor';
import { createFirebaseRepository } from 'model-hotspot-editor/firebase';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import 'model-hotspot-editor/style.css';

// Mount with :key="userId + ':' + sceneId" when navigating between CMS records.
const props = defineProps<{ firestore: Firestore; storage: FirebaseStorage; userId: string; sceneId?: string }>();
const emit = defineEmits<{ saved: [scene: SceneDocument]; select: [point: Hotspot] }>();
const repository = createFirebaseRepository({ firestore: props.firestore, storage: props.storage, getUserId: () => props.userId });
const { document, modelUrl, busy, dirty, error, openFile, load, save } = useModelSession(repository);
onMounted(() => { if (props.sceneId) void load(props.sceneId); });
async function chooseFile(event: Event) {
  const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = '';
  if (file && (!dirty.value || window.confirm('Abbandonare le modifiche non salvate?'))) await openFile(file);
}
async function saveScene() { if (await save()) emit('saved', document.value); }
// Expose dirty so the CMS router/dialog can guard pending edits.
defineExpose({ dirty });
</script>
<template>
  <section>
    <input type="file" accept=".glb" :disabled="busy" aria-label="Carica modello GLB" @change="chooseFile" />
    <v-alert v-if="error" type="error" variant="tonal" class="my-3">{{ error }}</v-alert>
    <ModelEditor v-model="document" :src="modelUrl" :disabled="busy" @select="emit('select', $event)" />
    <v-btn color="primary" class="mt-4" :loading="busy" :disabled="busy || !document.model" @click="saveScene">Salva modello e punti</v-btn>
  </section>
</template>
