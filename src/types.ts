// Shared types across the photobooth app.

export interface Photo {
  id: string;
  dataUrl: string;
  blob: Blob;
  createdAt: number;
}

export type FacingMode = 'user' | 'environment';

export interface CameraState {
  stream: MediaStream | null;
  facing: FacingMode;
  ready: boolean;
}

export type AiStatus = 'loading' | 'ready' | 'detecting' | 'error';

export interface AiStatusUpdate {
  status: AiStatus;
  message: string;
}
