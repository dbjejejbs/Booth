// Capture module — composites the live camera frame and the active
// decorative frame onto a high-resolution canvas, returns a PNG blob.
// Also drives the white flash + "Captured ❤️" toast visuals.

export interface CaptureResult {
  blob: Blob;
  dataUrl: string;
}

export class Capture {
  private video: HTMLVideoElement;
  private flashEl: HTMLElement;
  private toastEl: HTMLElement;

  constructor(
    video: HTMLVideoElement,
    flashEl: HTMLElement,
    toastEl: HTMLElement,
  ) {
    this.video = video;
    this.flashEl = flashEl;
    this.toastEl = toastEl;
  }

  /** Fire the flash animation. */
  flash(): void {
    this.flashEl.classList.remove('fire');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('fire');
  }

  /** Show the "Captured ❤️" toast (re-triggers the CSS animation). */
  toast(): void {
    this.toastEl.classList.remove('hidden');
    this.toastEl.classList.remove('capture-toast');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('capture-toast');
    window.setTimeout(() => this.toastEl.classList.add('hidden'), 1600);
  }

  /**
   * Composite the current video frame + overlay frame onto a canvas.
   * The output is a 3:4 portrait photo at high resolution.
   * The video is mirrored in the UI, so we mirror the canvas draw to match.
   */
  async snap(frameImage: HTMLImageElement | null): Promise<CaptureResult> {
    const vw = this.video.videoWidth || 1080;
    const vh = this.video.videoHeight || 1440;

    // Target a 3:4 portrait canvas.
    const outW = 1080;
    const outH = 1440;

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d')!;

    // Fill with a soft pink base in case of letterboxing.
    ctx.fillStyle = '#fff5f8';
    ctx.fillRect(0, 0, outW, outH);

    // Draw the camera, cover-fit, mirrored to match the on-screen selfie.
    ctx.save();
    ctx.translate(outW, 0);
    ctx.scale(-1, 1);
    drawCover(ctx, this.video, vw, vh, outW, outH);
    ctx.restore();

    // Draw the decorative frame on top (not mirrored).
    if (frameImage && frameImage.complete && frameImage.naturalWidth > 0) {
      ctx.drawImage(frameImage, 0, 0, outW, outH);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob(
        (b) => resolve(b ?? new Blob()),
        'image/png',
        1,
      ),
    );
    return { blob, dataUrl };
  }
}

/** Draw a source element into the target rect using object-fit: cover. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): void {
  const sAspect = sw / sh;
  const dAspect = dw / dh;
  let sx = 0,
    sy = 0,
    sW = sw,
    sH = sh;
  if (sAspect > dAspect) {
    // source wider — crop sides
    sW = sh * dAspect;
    sx = (sw - sW) / 2;
  } else {
    // source taller — crop top/bottom
    sH = sw / dAspect;
    sy = (sh - sH) / 2;
  }
  ctx.drawImage(src, sx, sy, sW, sH, 0, 0, dw, dh);
}
