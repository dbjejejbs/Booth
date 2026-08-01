// Frames module — auto-loads transparent PNG frames from /assets/frames/.
// If the folder has no images, elegant built-in SVG frames are generated
// so the app always has something to show. Users can drop new PNGs in
// assets/frames/ (frame1.png, frame2.png, ...) without touching code.

export interface Frame {
  id: string;
  name: string;
  /** An image element ready to draw onto a canvas. */
  image: HTMLImageElement;
}

const FRAME_DIR = '/assets/frames/';
const FRAME_FILES = [
  'frame1.png',
  'frame2.png',
  'frame3.png',
  'frame4.png',
  'frame5.png',
];

/** Built-in SVG frames rendered as data URLs (used if no PNGs load). */
const BUILTIN_SVGS: { name: string; svg: string }[] = [
  {
    name: 'Petal',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1440' viewBox='0 0 1080 1440'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stop-color='#ff9ec2' stop-opacity='0.9'/>
          <stop offset='1' stop-color='#b196ff' stop-opacity='0.9'/>
        </linearGradient>
      </defs>
      <rect x='0' y='0' width='1080' height='1440' fill='none'/>
      <rect x='24' y='24' width='1032' height='1392' rx='48' fill='none' stroke='url(#g)' stroke-width='14'/>
      <text x='540' y='1380' font-family='Cormorant Garamond, serif' font-size='52' font-style='italic' fill='url(#g)' text-anchor='middle'>Romantic Booth</text>
    </svg>`,
  },
  {
    name: 'Lavender Lace',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1440' viewBox='0 0 1080 1440'>
      <rect x='0' y='0' width='1080' height='1440' fill='none'/>
      <rect x='40' y='40' width='1000' height='1360' rx='60' fill='none' stroke='#cbb3ff' stroke-width='6' stroke-dasharray='14 10'/>
      <rect x='60' y='60' width='960' height='1320' rx='52' fill='none' stroke='#ff9ec2' stroke-width='3'/>
      <text x='540' y='80' font-family='Quicksand, sans-serif' font-size='34' font-weight='600' fill='#b196ff' text-anchor='middle'>with love</text>
    </svg>`,
  },
  {
    name: 'Heart Crown',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1440' viewBox='0 0 1080 1440'>
      <rect x='0' y='0' width='1080' height='1440' fill='none'/>
      <rect x='20' y='20' width='1040' height='1400' rx='40' fill='none' stroke='#ff4d90' stroke-width='10'/>
      <text x='540' y='90' font-size='70' text-anchor='middle'>💖</text>
      <text x='540' y='1380' font-family='Cormorant Garamond, serif' font-size='48' font-style='italic' fill='#ff4d90' text-anchor='middle'>you &amp; me</text>
    </svg>`,
  },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export class FrameManager {
  private frames: Frame[] = [];
  private index = 0;

  get current(): Frame | null {
    return this.frames[this.index] ?? null;
  }

  get count(): number {
    return this.frames.length;
  }

  /** Attempt to load PNG frames; fall back to built-in SVGs. */
  async load(): Promise<void> {
    const loaded: Frame[] = [];

    // Try the PNG files in parallel; ignore any that 404.
    const results = await Promise.allSettled(
      FRAME_FILES.map(async (file, i) => {
        const img = await loadImage(FRAME_DIR + file);
        loaded.push({ id: `png-${i}`, name: `Frame ${i + 1}`, image: img });
      }),
    );

    const pngOk = results.some((r) => r.status === 'fulfilled');

    if (!pngOk) {
      // Generate built-in SVG frames so the app is never frame-less.
      for (const f of BUILTIN_SVGS) {
        const img = await loadImage(
          'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(f.svg),
        );
        loaded.push({ id: `svg-${f.name}`, name: f.name, image: img });
      }
    }

    this.frames = loaded;
  }

  /** Advance to the next frame and return it. */
  next(): Frame | null {
    if (this.frames.length === 0) return null;
    this.index = (this.index + 1) % this.frames.length;
    return this.current;
  }

  /** Set the overlay <img> to the current frame. */
  applyToOverlay(overlay: HTMLImageElement): void {
    const f = this.current;
    if (!f) {
      overlay.classList.remove('show');
      overlay.src = '';
      return;
    }
    overlay.src = f.image.src;
    overlay.classList.add('show');
  }
}
