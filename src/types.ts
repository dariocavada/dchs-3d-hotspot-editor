export interface Vector3 { x: number; y: number; z: number }
export interface CameraState {
  orbit: { theta: number; phi: number; radius: number };
  target: Vector3;
  fieldOfView: number;
}
export interface ModelAsset {
  /** SHA-256 of the exact GLB bytes. */
  id: string;
  name: string;
  byteLength: number;
}
export interface Hotspot {
  id: string;
  title: string;
  description: string;
  position: Vector3;
  normal: Vector3;
  camera: CameraState | null;
  contentId: string;
  linkUrl: string;
  imageUrl: string;
  audioUrl: string;
}
export interface SceneDocument {
  schemaVersion: 1;
  id: string;
  title: string;
  model: ModelAsset | null;
  hotspots: Hotspot[];
  initialCamera: CameraState | null;
  revision: number;
  updatedAt: string | null;
}
export interface SurfaceHit { position: Vector3; normal: Vector3 }
export interface SceneSummary { id: string; title: string; updatedAt: string | null; revision: number }
export interface LoadedScene { document: SceneDocument; blob?: Blob; url?: string }
export interface SaveRequest {
  document: SceneDocument;
  /** Supply when introducing a new asset, not for every annotation edit. */
  blob?: Blob;
  onProgress?: (fraction: number) => void;
}
export interface SceneRepository {
  list(): Promise<SceneSummary[]>;
  load(id: string): Promise<LoadedScene | null>;
  save(request: SaveRequest): Promise<SceneDocument>;
}
export interface ViewerHandle {
  captureCamera(): CameraState | null;
  goToCamera(camera: CameraState): void;
  resetCamera(): void;
}
