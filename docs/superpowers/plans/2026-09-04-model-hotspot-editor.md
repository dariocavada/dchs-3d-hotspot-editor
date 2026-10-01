# Model Studio Implementation Plan

> For agentic workers: execute tasks sequentially and verify each deliverable.

**Goal:** library, local demo and optional Firebase adapter for annotated GLB assets.
**Architecture:** pure typed document/actions + Vue viewer + Vuetify editor + adapters.
**Tech Stack:** Vue 3.5, Vuetify 3, model-viewer 4, Firebase JS 11/12, Vite, TypeScript.
**Spec:** ../specs/2026-09-04-model-hotspot-editor.md

## Global constraints
Preserve the CMS's Vue 3 / Vuetify 3 stack. Firebase optional. No open write rules.
No credentials. GLB max 100 MiB. 100 hotspots maximum. Document budget 700 KiB.

## Tasks
1. Domain: types.ts; domain/{schema,actions,glb,gesture,revision}.ts.
   RED: node tests check duplicate IDs, unsafe URLs, file header/length,
   immutable editing, drag rejection and stale revisions. GREEN: implement.
   Verify: `npm test`.
2. Storage: adapters/local.ts, adapters/firebase.ts, composables/useModelSession.ts.
   Input SceneDocument + optional GLB; output new revision and hydrated blob or URL.
   A transaction rejects mismatched expectedRevision; assets keyed by SHA-256.
   Verify local IndexedDB round trip in browser. Firebase SDK remains an external seam.
3. UI: components/{ModelViewer,ModelEditor,HotspotForm}.vue and demo/App.vue.
   Tests: pointer drags do not add points, edits emit immutable v-model updates,
   load/save/import restores the scene. Verify browser tests with a real renderer
   where dependencies are available, otherwise report the unavailable verification.
4. Packaging: ESM entrypoints, CSS, TypeScript declarations, README, Firebase rules,
   GitHub Actions build/test workflow, original procedural GLB fixture.
   Verify `npm run check`, `npm pack --dry-run`; do not claim unexecuted checks pass.
