// Camera module — manages getUserMedia, front/rear switching, and cleanup.
// Exposes a single <video> element the rest of the app reads from.

import type { FacingMode } from './types';

export class Camera {
  private video: HTMLVideoElement;
  stream: MediaStream | null = null;
  facing: FacingMode = 'user';

  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  /** Start the camera with the given facing mode. */
  async start(facing: FacingMode = this.facing): Promise<void> {
    this.facing = facing;
    this.stop();

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: facing,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      // Some mobile browsers reject the ideal constraints; retry loosely.
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
    }

    this.stream = stream;
    this.video.srcObject = stream;
    await this.video.play().catch(() => {
      /* autoplay may be blocked until a gesture; ignore */
    });
  }

  /** Switch between front and rear cameras. */
  async switch(): Promise<void> {
    const next: FacingMode = this.facing === 'user' ? 'environment' : 'user';
    await this.start(next);
  }

  /** The effective pixel dimensions of the playing video. */
  get dimensions(): { width: number; height: number } {
    return {
      width: this.video.videoWidth || 1080,
      height: this.video.videoHeight || 1440,
    };
  }

  stop(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    this.video.srcObject = null;
  }

  dispose(): void {
    this.stop();
  }
}
