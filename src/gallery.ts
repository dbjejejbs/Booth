// Gallery module — stores captured photos, renders a drawer grid, and
// powers the lightbox (preview / download / delete / retake).

import type { Photo } from './types';

export interface GalleryCallbacks {
  onRetake?: (photo: Photo) => void;
}

export class Gallery {
  private photos: Photo[] = [];
  private current: Photo | null = null;
  private cb: GalleryCallbacks;

  constructor(private els: {
    grid: HTMLElement;
    emptyMsg: HTMLElement;
    drawer: HTMLElement;
    scrim: HTMLElement;
    toggleBtn: HTMLElement;
    closeBtn: HTMLElement;
    countEl: HTMLElement;
    previewWrap: HTMLElement;
    previewThumb: HTMLImageElement;
    lightbox: HTMLElement;
    lightboxImg: HTMLImageElement;
    lbClose: HTMLElement;
    lbDownload: HTMLElement;
    lbRetake: HTMLElement;
    lbDelete: HTMLElement;
  }, cb: GalleryCallbacks = {}) {
    this.cb = cb;
    this.bind();
  }

  private get grid(): HTMLElement { return this.els.grid; }
  private get emptyMsg(): HTMLElement { return this.els.emptyMsg; }
  private get drawer(): HTMLElement { return this.els.drawer; }
  private get scrim(): HTMLElement { return this.els.scrim; }
  private get toggleBtn(): HTMLElement { return this.els.toggleBtn; }
  private get closeBtn(): HTMLElement { return this.els.closeBtn; }
  private get countEl(): HTMLElement { return this.els.countEl; }
  private get previewWrap(): HTMLElement { return this.els.previewWrap; }
  private get previewThumb(): HTMLImageElement { return this.els.previewThumb; }
  private get lightbox(): HTMLElement { return this.els.lightbox; }
  private get lightboxImg(): HTMLImageElement { return this.els.lightboxImg; }
  private get lbClose(): HTMLElement { return this.els.lbClose; }
  private get lbDownload(): HTMLElement { return this.els.lbDownload; }
  private get lbRetake(): HTMLElement { return this.els.lbRetake; }
  private get lbDelete(): HTMLElement { return this.els.lbDelete; }

  private bind(): void {
    this.toggleBtn.addEventListener('click', () => this.toggle());
    this.closeBtn.addEventListener('click', () => this.close());
    this.scrim.addEventListener('click', () => this.close());
    this.lbClose.addEventListener('click', () => this.hideLightbox());
    this.lbDownload.addEventListener('click', () =>
      this.current && downloadPhoto(this.current),
    );
    this.lbRetake.addEventListener('click', () => {
      if (this.current) this.cb.onRetake?.(this.current);
      this.hideLightbox();
    });
    this.lbDelete.addEventListener('click', () => {
      if (this.current) this.remove(this.current.id);
      this.hideLightbox();
    });
    this.previewWrap.addEventListener('click', () => this.toggle());
  }

  add(photo: Photo): void {
    this.photos.unshift(photo);
    this.render();
    this.updatePreview();
  }

  remove(id: string): void {
    this.photos = this.photos.filter((p) => p.id !== id);
    this.render();
    this.updatePreview();
  }

  private render(): void {
    this.countEl.textContent = String(this.photos.length);
    this.countEl.toggleAttribute('data-zero', this.photos.length === 0);

    if (this.photos.length === 0) {
      this.emptyMsg.classList.remove('hidden');
      this.grid.querySelectorAll('.gallery-item').forEach((n) => n.remove());
      return;
    }
    this.emptyMsg.classList.add('hidden');

    // Rebuild efficiently
    this.grid.querySelectorAll('.gallery-item').forEach((n) => n.remove());
    for (const photo of this.photos) {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      const img = document.createElement('img');
      img.src = photo.dataUrl;
      img.alt = 'Captured photo';
      item.appendChild(img);
      item.addEventListener('click', () => this.openLightbox(photo));
      this.grid.appendChild(item);
    }
  }

  private updatePreview(): void {
    if (this.photos.length === 0) {
      this.previewWrap.classList.add('hidden');
      return;
    }
    this.previewThumb.src = this.photos[0].dataUrl;
    this.previewWrap.classList.remove('hidden');
  }

  toggle(): void {
    const open = this.drawer.classList.contains('open');
    if (open) this.close();
    else this.open();
  }

  private open(): void {
    this.drawer.classList.add('open');
    this.drawer.setAttribute('aria-hidden', 'false');
    this.scrim.classList.remove('hidden');
    void this.scrim.offsetWidth;
    this.scrim.classList.add('show');
  }

  private close(): void {
    this.drawer.classList.remove('open');
    this.drawer.setAttribute('aria-hidden', 'true');
    this.scrim.classList.remove('show');
    window.setTimeout(() => this.scrim.classList.add('hidden'), 400);
  }

  private openLightbox(photo: Photo): void {
    this.current = photo;
    this.lightboxImg.src = photo.dataUrl;
    this.lightbox.classList.remove('hidden');
  }

  private hideLightbox(): void {
    this.lightbox.classList.add('hidden');
    this.current = null;
  }
}

/** Trigger a PNG download with the romantic-photo-YYYYMMDD-HHmmss.png name. */
export function downloadPhoto(photo: Photo): void {
  const ts = formatStamp(photo.createdAt);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(photo.blob);
  a.download = `romantic-photo-${ts}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function formatStamp(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}
