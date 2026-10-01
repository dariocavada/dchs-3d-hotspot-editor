<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import ModelEditor from '../src/components/ModelEditor.vue';
import { useModelSession } from '../src/composables/useModelSession.js';
import { createLocalRepository } from '../src/adapters/local.js';
import { addHotspot } from '../src/domain/actions.js';
import type { SceneRepository, SceneSummary } from '../src/types.js';
import type { DemoFirebase } from './firebase-client.js';
export default defineComponent({
  name: 'ModelStudioDemo', components: { ModelEditor },
  setup() {
    const local = createLocalRepository(); const repository = shallowRef<SceneRepository>(local);
    const session = useModelSession(repository);
    const mode = ref<'local' | 'firebase'>('local'); const scenes = ref<SceneSummary[]>([]); const sceneId = ref('');
    const fileInput = ref<HTMLInputElement>(); const jsonInput = ref<HTMLInputElement>();
    const toast = ref(''); const toastOpen = ref(false); const cloudDialog = ref(false);
    const email = ref(''); const password = ref(''); const loginError = ref(''); const signingIn = ref(false); const account = ref('');
    const configured = !!import.meta.env.VITE_FIREBASE_API_KEY;
    let cloud: DemoFirebase | null = null;
    const notice = (message: string) => { toast.value = message; toastOpen.value = true; };
    const canDiscard = () => !session.dirty.value || window.confirm('Ci sono modifiche non salvate. Continuare senza salvarle?');
    async function refreshScenes() {
      try { scenes.value = await repository.value.list(); }
      catch (e) { session.error.value = e instanceof Error ? e.message : String(e); }
    }
    async function onFile(event: Event) {
      const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = '';
      if (file && canDiscard()) { if (await session.openFile(file)) sceneId.value = ''; }
    }
    async function loadSample() {
      if (session.busy.value || !canDiscard()) return;
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}sample-vase.glb`);
        if (!response.ok) throw new Error('Modello dimostrativo non trovato.');
        const file = new File([await response.blob()], 'vaso-demo.glb', { type: 'model/gltf-binary' });
        if (!await session.openFile(file)) return;
        let doc = { ...session.document.value, title: 'Vaso di studio' };
        doc = addHotspot(doc, { position: { x: 0.12, y: 1.73, z: .345 }, normal: { x: .3, y: 0, z: .95 } },
          { orbit: { theta: .33, phi: .9, radius: 3.1 }, target: { x: 0, y: 1.24, z: 0 }, fieldOfView: 30 });
        doc = addHotspot(doc, { position: { x: -.24, y: .85, z: .61 }, normal: { x: -.36, y: 0, z: .93 } },
          { orbit: { theta: -.2, phi: 1.15, radius: 3.8 }, target: { x: 0, y: .85, z: 0 }, fieldOfView: 30 });
        doc.hotspots[0] = { ...doc.hotspots[0]!, title: 'Il bordo', description: 'Un primo punto di osservazione. Seleziona il dettaglio, modifica questo testo e memorizza l’inquadratura che preferisci.' };
        doc.hotspots[1] = { ...doc.hotspots[1]!, title: 'La superficie', description: 'Collega una scheda del CMS, un’immagine o un audio. Questo vaso è un modello procedurale dimostrativo, non la riproduzione di un reperto storico.' };
        session.document.value = doc; sceneId.value = '';
      } catch (e) { session.error.value = e instanceof Error ? e.message : String(e); }
    }
    async function saveScene() {
      if (await session.save()) { sceneId.value = session.document.value.id; await refreshScenes(); notice(mode.value === 'local' ? 'Salvato in questo browser.' : 'Scena e modello salvati su Firebase.'); }
    }
    async function openScene() { if (sceneId.value && canDiscard()) await session.load(sceneId.value); }
    function download(blob: Blob, name: string) {
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function exportJson() {
      try { download(new Blob([session.exportJson()], { type: 'application/json' }), `${session.document.value.id}.json`); }
      catch (e) { session.error.value = e instanceof Error ? e.message : String(e); }
    }
    async function importJson(event: Event) {
      const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = '';
      if (file && canDiscard() && await session.importJson(file)) notice('Annotazioni importate sul modello corrente.');
    }
    function exportModel() { if (session.modelBlob.value && session.document.value.model) download(session.modelBlob.value, session.document.value.model.name); }
    async function useLocal() {
      if (mode.value === 'local' || session.busy.value || !canDiscard()) return;
      session.reset(); repository.value = local; mode.value = 'local'; sceneId.value = ''; await refreshScenes();
    }
    async function useFirebase() {
      if (mode.value === 'firebase' || session.busy.value) return;
      loginError.value = ''; cloudDialog.value = true;
      if (!configured) return;
      try {
        cloud ??= await (await import('./firebase-client.js')).createDemoFirebase();
        if (cloud.signedIn()) await activateCloud();
      } catch (e) { loginError.value = e instanceof Error ? e.message : String(e); }
    }
    async function activateCloud() {
      if (!cloud || !canDiscard()) return;
      session.reset(); repository.value = cloud.repository; mode.value = 'firebase'; account.value = cloud.userEmail();
      sceneId.value = ''; cloudDialog.value = false; password.value = ''; await refreshScenes();
    }
    async function login() {
      signingIn.value = true; loginError.value = '';
      try {
        cloud ??= await (await import('./firebase-client.js')).createDemoFirebase();
        await cloud.login(email.value.trim(), password.value); await activateCloud();
      } catch (e) { loginError.value = e instanceof Error ? e.message : String(e); }
      finally { signingIn.value = false; }
    }
    async function logout() {
      if (session.busy.value || !canDiscard()) return;
      try { await cloud?.logout(); session.reset(); repository.value = local; mode.value = 'local'; account.value = ''; await refreshScenes(); }
      catch (e) { session.error.value = e instanceof Error ? e.message : String(e); }
    }
    function beforeUnload(event: BeforeUnloadEvent) { if (session.dirty.value) { event.preventDefault(); event.returnValue = ''; } }
    onMounted(() => { window.addEventListener('beforeunload', beforeUnload); void refreshScenes(); void loadSample(); });
    onBeforeUnmount(() => { window.removeEventListener('beforeunload', beforeUnload); local.close(); });
    return { ...session, mode, scenes, sceneId, fileInput, jsonInput, toast, toastOpen, cloudDialog,
      email, password, loginError, signingIn, account, configured, onFile, loadSample, saveScene, openScene,
      exportJson, importJson, exportModel, useLocal, useFirebase, login, logout };
  }
});
</script>
<template>
  <v-app>
    <header class="studio-header">
      <div class="studio-brand"><span class="studio-brand__mark" aria-hidden="true">◇</span><div><strong>Model Hotspot Editor</strong></div></div>
      <div class="studio-header__right"><span class="studio-version">Vue 3 · Vuetify 3</span><span class="studio-pill">COMPONENT LAB</span></div>
    </header>
    <v-main class="studio-main">
      <div class="studio-intro"><div><p class="studio-eyebrow">OGGETTI, DETTAGLI, STORIE.</p><h1>Dai una voce al tuo modello.</h1><p>Carica un oggetto 3D. Aggiungi i punti. Costruisci l’esperienza.</p></div>
        <div class="studio-storage"><span>SALVATAGGIO</span><div><button type="button" :class="{ active: mode === 'local' }" :disabled="busy" @click="useLocal">Nel browser</button><button type="button" :class="{ active: mode === 'firebase' }" :disabled="busy" @click="useFirebase">Firebase ↗</button></div></div>
      </div>
      <div v-if="mode === 'firebase'" class="studio-account">{{ account }}<v-btn size="x-small" variant="text" :disabled="busy" @click="logout">Esci</v-btn></div>
      <section class="studio-workspace">
        <div class="studio-filebar">
          <div class="studio-filebar__actions">
            <v-btn color="primary" variant="outlined" :disabled="busy" @click="fileInput?.click()">↑ Carica GLB</v-btn>
            <v-btn variant="text" size="small" :disabled="busy" @click="loadSample">Modello demo</v-btn>
          </div>
          <div class="studio-filebar__save"><span :class="['studio-save-state', { dirty }]">{{ busy ? 'Operazione in corso' : dirty ? 'Modifiche non salvate' : 'Nessuna modifica' }}</span><v-btn color="primary" :disabled="busy || !document.model" :loading="busy" @click="saveScene">Salva esperienza</v-btn></div>
          <input ref="fileInput" type="file" accept=".glb,model/gltf-binary" hidden aria-label="Carica modello GLB" @change="onFile" />
          <input ref="jsonInput" type="file" accept=".json,application/json" hidden aria-label="Importa annotazioni JSON" @change="importJson" />
        </div>
        <v-progress-linear v-if="busy" :model-value="progress * 100" :indeterminate="progress === 0" color="primary" class="mb-4" />
        <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = ''">{{ error }}</v-alert>
        <ModelEditor v-model="document" :src="modelUrl" :disabled="busy" />
        <div class="studio-assetbar"><span v-if="document.model">{{ document.model.name }}<span class="studio-separator">/</span>{{ (document.model.byteLength / 1024 / 1024).toFixed(2) }} MiB<span class="studio-separator">/</span>Rev. {{ document.revision }}</span><span v-else>GLB autosufficiente · massimo 100 MiB</span><span>Il modello resta tuo. I punti sono dati.</span></div>
      </section>
      <section class="studio-bottom">
        <div class="studio-library"><div class="studio-section-number">01</div><div class="studio-bottom__content"><h2>Le tue esperienze</h2><p>{{ mode === 'local' ? 'Scena e GLB sono salvati in IndexedDB, solo in questo browser.' : 'Scena in Firestore, modello in Storage. Accesso riservato al tuo utente.' }}</p><div class="studio-open"><v-select v-model="sceneId" :items="scenes" item-title="title" item-value="id" label="Esperienza salvata" variant="outlined" density="compact" hide-details :disabled="busy" no-data-text="Nessuna esperienza salvata" /><v-btn variant="outlined" :disabled="busy || !sceneId" @click="openScene">Apri</v-btn></div></div></div>
        <div class="studio-portable"><div class="studio-section-number">02</div><div class="studio-bottom__content"><h2>Portala nel tuo CMS</h2><p>Il JSON contiene annotazioni e inquadrature. Il GLB si trasferisce separatamente.</p><div class="studio-portable__actions"><v-btn variant="outlined" size="small" :disabled="busy || !document.model" @click="exportJson">Esporta JSON</v-btn><v-btn variant="text" size="small" :disabled="busy || !document.model" @click="jsonInput?.click()">Importa JSON</v-btn><v-btn variant="text" size="small" :disabled="busy || !modelBlob" @click="exportModel">Scarica GLB</v-btn></div></div></div>
      </section>
      <footer class="studio-footer"><span>MODEL STUDIO <span class="studio-footer__dot">●</span> v0.1.0</span><span>Viewer indipendente · Editor riutilizzabile · Firebase opzionale</span></footer>
    </v-main>
    <v-snackbar v-model="toastOpen" :timeout="3500">{{ toast }}</v-snackbar>
    <v-dialog v-model="cloudDialog" max-width="460">
      <v-card rounded="xl" class="pa-3"><v-card-title>Collega Firebase</v-card-title><v-card-text>
        <div v-if="!configured"><p>La demo locale funziona già senza account.</p><p class="mt-3">Per attivare Firebase, copia <code>.env.example</code> in <code>.env</code>, inserisci la configurazione del tuo progetto e riavvia Vite. La guida è in <code>docs/FIREBASE.md</code>.</p></div>
        <form v-else @submit.prevent="login"><p class="mb-5">Accedi con un utente Email/Password già creato nel tuo progetto Firebase.</p>
          <v-text-field v-model="email" label="Email" type="email" autocomplete="username" variant="outlined" :disabled="signingIn" />
          <v-text-field v-model="password" label="Password" type="password" autocomplete="current-password" variant="outlined" :disabled="signingIn" />
          <v-alert v-if="loginError" type="error" density="compact" class="mb-4">{{ loginError }}</v-alert>
          <v-btn color="primary" type="submit" :loading="signingIn" :disabled="!email || !password" block>Accedi e usa Firebase</v-btn>
        </form>
      </v-card-text><v-card-actions><v-spacer /><v-btn :disabled="signingIn" @click="cloudDialog = false">Chiudi</v-btn></v-card-actions></v-card>
    </v-dialog>
  </v-app>
</template>
<style>
body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.studio-header { height: 88px; padding: 0 5%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e9df; background: #fafbf7; }
.studio-brand { display: flex; align-items: center; gap: 13px; }
.studio-brand__mark { display: grid; place-items: center; border-radius: 12px; background: #23583f; color: #dceadb; width: 42px; height: 42px; font-size: 29px; }
.studio-brand strong { font-size: 18px; font-weight: 600; color: #1e362a; }
.studio-brand strong span { color: #bac7b7; margin: 0 9px; font-weight: 300; }
.studio-brand small { font-size: 12px; color: #737f6e; }
.studio-header__right { display: flex; align-items: center; gap: 24px; }
.studio-version { font-size: 11px; color: #788371; }
.studio-pill { border: 1px solid #dbe4d4; color: #64785d; border-radius: 20px; font-size: 9px; letter-spacing: .13em; padding: 7px 11px; }
.studio-main { max-width: 1500px; width: 90%; margin: 0 auto; }
.studio-intro { display: flex; justify-content: space-between; align-items: end; gap: 20px; padding: 49px 0 33px; }
.studio-eyebrow { color: #7b876d; font-size: 10px; letter-spacing: .19em; font-weight: 600; margin-bottom: 12px; }
.studio-intro h1 { color: #273d2e; font-size: clamp(28px, 3vw, 39px); line-height: 1.15; letter-spacing: -.035em; font-weight: 500; }
.studio-intro h1 + p { font-size: 13px; color: #7c8577; margin-top: 13px; }
.studio-storage > span { display: block; font-size: 9px; letter-spacing: .16em; color: #7c8972; margin-bottom: 9px; }
.studio-storage > div { display: flex; gap: 5px; border: 1px solid #dce4d6; border-radius: 8px; padding: 3px; }
.studio-storage button { font-size: 11px; color: #677962; border-radius: 5px; padding: 7px 12px; }
.studio-storage button.active { background: #e6eddf; color: #314b32; }
.studio-workspace { background: #fff; border: 1px solid #e0e6da; border-radius: 20px; padding: 25px; box-shadow: 0 10px 35px #2f422408; }
.studio-filebar { display: flex; justify-content: space-between; align-items: center; gap: 18px; margin-bottom: 24px; padding-bottom: 23px; border-bottom: 1px solid #edf0e8; }
.studio-filebar__actions, .studio-filebar__save { display: flex; align-items: center; gap: 12px; }
.studio-save-state { font-size: 11px; color: #687c63; }
.studio-save-state.dirty { color: #9b7b45; }
.studio-assetbar { display: flex; justify-content: space-between; gap: 16px; margin-top: 20px; color: #828d7b; font-size: 10px; }
.studio-separator { padding: 0 12px; color: #bcc5b5; }
.studio-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; padding: 37px 4px 30px; }
.studio-library, .studio-portable { display: flex; gap: 18px; }
.studio-section-number { color: #92a086; font-size: 11px; padding-top: 3px; }
.studio-bottom__content { flex: 1; min-width: 0; }
.studio-bottom h2 { font-size: 15px; color: #405437; font-weight: 600; }
.studio-bottom p { font-size: 11px; color: #7e8b72; line-height: 1.7; margin: 8px 0 17px; }
.studio-open { display: flex; gap: 10px; align-items: center; max-width: 460px; }
.studio-portable__actions { display: flex; flex-wrap: wrap; gap: 7px; }
.studio-footer { display: flex; justify-content: space-between; gap: 15px; border-top: 1px solid #e1e7d9; padding: 23px 0 28px; color: #8b967e; font-size: 9px; letter-spacing: .05em; }
.studio-footer__dot { font-size: 6px; padding: 0 8px; }
.studio-account { display: flex; align-items: center; justify-content: flex-end; gap: 10px; font-size: 12px; color: #657960; margin-bottom: 10px; }
@media(max-width: 780px) { .studio-header { padding: 0 5%; height: 74px; } .studio-header__right { display: none; } .studio-brand small { font-size: 10px; } .studio-intro { flex-direction: column; align-items: start; padding-top: 32px; } .studio-workspace { padding: 16px; border-radius: 14px; } .studio-filebar { flex-wrap: wrap; } .studio-filebar__save { width: 100%; justify-content: space-between; } .studio-assetbar { flex-direction: column; gap: 5px; } .studio-bottom { grid-template-columns: 1fr; gap: 28px; } .studio-footer { flex-wrap: wrap; } }
</style>
