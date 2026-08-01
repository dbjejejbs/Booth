// Romantic AI Photobooth — entry point.
// Opens directly into the camera, runs hand-gesture detection, and
// captures automatically when a peace sign is held for ~1 second.

import './style.css';
import { Camera } from './camera';
import { GestureDetector } from './gesture';
import { FrameManager } from './frames';
import { Capture, type CaptureResult } from './capture';
import { Gallery } from './gallery';
import { AudioEngine } from './audio';
import { Effects } from './effects';
import type { Photo } from './types';

const $ = <T extends HTMLElement>(sel: string): T =>
  document.querySelector<T>(sel)!;

function ready(): void {
  const video = $<HTMLVideoElement>('#camera');
  const frameOverlay = $<HTMLImageElement>('#frame-overlay');
  const statusDot = $<HTMLElement>('#status-dot');
  const statusText = $<HTMLElement>('#status-text');
  const countdownEl = $<HTMLElement>('#countdown');
  const countdownNum = $<HTMLElement>('#countdown-number');
  const hintEl = $<HTMLElement>('#hint');
  const errorBanner = $<HTMLElement>('#error-banner');
  const errorMsg = $<HTMLElement>('#error-msg');
  const errorTitle = $<HTMLElement>('#error-title');

  const audio = new AudioEngine();
  const effects = new Effects($<HTMLElement>('#particles'));
  effects.start();

  const camera = new Camera(video);
  const frames = new FrameManager();
  const capture = new Capture(video, $<HTMLElement>('#flash'), $<HTMLElement>('#capture-toast'));
  const gallery = new Gallery({
    grid: $<HTMLElement>('#gallery-grid'),
    emptyMsg: $<HTMLElement>('#gallery-empty'),
    drawer: $<HTMLElement>('#gallery-drawer'),
    scrim: $<HTMLElement>('#drawer-scrim'),
    toggleBtn: $<HTMLElement>('#gallery-toggle'),
    closeBtn: $<HTMLElement>('#gallery-close'),
    countEl: $<HTMLElement>('#gallery-count'),
    previewWrap: $<HTMLElement>('#gallery-preview'),
    previewThumb: $<HTMLImageElement>('#preview-thumb'),
    lightbox: $<HTMLElement>('#lightbox'),
    lightboxImg: $<HTMLImageElement>('#lightbox-img'),
    lbClose: $<HTMLElement>('#lightbox-close'),
    lbDownload: $<HTMLElement>('#lb-download'),
    lbRetake: $<HTMLElement>('#lb-retake'),
    lbDelete: $<HTMLElement>('#lb-delete'),
  });

  let capturing = false;

  function setStatus(state: 'loading' | 'ready' | 'detecting' | 'error', msg: string): void {
    statusDot.className = 'status-dot ' + (state === 'ready' ? 'ready' : state);
    statusText.textContent = msg;
  }

  // ---- Gesture handler -------------------------------------------------
  const gesture = new GestureDetector(video, {
    fps: 12,
    onStatus: (msg) => setStatus('detecting', msg),
    onGesture: () => triggerCapture(),
  });

  // ---- Capture flow ----------------------------------------------------
  async function triggerCapture(): Promise<void> {
    if (capturing) return;
    capturing = true;
    gesture.pause();
    hintEl.classList.add('fade');

    // Blur the live preview
    video.classList.add('blurred');
    audio.click();

    // Countdown 3 → 2 → 1
    await runCountdown();

    // Snap the photo
    let result: CaptureResult;
    try {
      result = await capture.snap(frames.current?.image ?? null);
    } catch {
      // If capture fails, recover gracefully.
      video.classList.remove('blurred');
      capturing = false;
      hintEl.classList.remove('fade');
      gesture.reset();
      gesture.start();
      return;
    }

    // Flash + toast + shutter sound
    capture.flash();
    audio.shutter();
    capture.toast();

    // Store in gallery
    const photo: Photo = {
      id: `p-${Date.now()}`,
      dataUrl: result.dataUrl,
      blob: result.blob,
      createdAt: Date.now(),
    };
    gallery.add(photo);

    // Remove blur, resume detection
    video.classList.remove('blurred');
    hintEl.classList.remove('fade');
    gesture.reset();
    // Brief cooldown so the just-finished gesture doesn't re-fire.
    window.setTimeout(() => {
      capturing = false;
      gesture.start();
    }, 1200);
  }

  function runCountdown(): Promise<void> {
    return new Promise((resolve) => {
      let n = 3;
      countdownEl.classList.remove('hidden');
      const tick = (): void => {
        countdownNum.textContent = String(n);
        // Restart the pop animation
        countdownNum.classList.remove('countdown-number');
        void countdownNum.offsetWidth;
        countdownNum.classList.add('countdown-number');
        audio.countdown();
        n -= 1;
        if (n < 0) {
          countdownEl.classList.add('hidden');
          resolve();
          return;
        }
        window.setTimeout(tick, 1000);
      };
      tick();
    });
  }

  // ---- Manual capture button -----------------------------------------
  $<HTMLElement>('#capture-btn').addEventListener('click', () => {
    audio.click();
    triggerCapture();
  });

  // ---- Switch camera ---------------------------------------------------
  $<HTMLElement>('#switch-cam').addEventListener('click', async () => {
    audio.click();
    try {
      await camera.switch();
    } catch {
      showError('Camera switch failed', 'Could not switch cameras on this device.');
    }
  });

  // ---- Switch frame ----------------------------------------------------
  $<HTMLElement>('#frame-btn').addEventListener('click', () => {
    audio.click();
    frames.next();
    frames.applyToOverlay(frameOverlay);
  });

  // ---- Error handling --------------------------------------------------
  function showError(title: string, msg: string): void {
    errorTitle.textContent = title;
    errorMsg.textContent = msg;
    errorBanner.classList.remove('hidden');
    setStatus('error', 'Camera error');
  }
  $<HTMLElement>('#error-retry').addEventListener('click', () => {
    errorBanner.classList.add('hidden');
    void boot();
  });

  // ---- Boot ------------------------------------------------------------
  async function boot(): Promise<void> {
    setStatus('loading', 'Starting camera…');
    try {
      await camera.start('user');
    } catch {
      showError(
        'Camera unavailable',
        'Please allow camera access in your browser and reload.',
      );
      return;
    }

    setStatus('loading', 'Loading AI model…');
    try {
      await gesture.load();
    } catch {
      showError(
        'AI model failed',
        'Could not load the hand-tracking model. Check your connection.',
      );
      return;
    }

    // Load frames and apply the first one.
    await frames.load();
    frames.applyToOverlay(frameOverlay);

    setStatus('ready', 'Show ✌️ to capture');
    gesture.start();
  }

  // Clean up on page hide to avoid leaks.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      gesture.pause();
    } else if (!capturing) {
      gesture.start();
    }
  });

  window.addEventListener('beforeunload', () => {
    gesture.dispose();
    camera.dispose();
    audio.dispose();
    effects.dispose();
  });

  void boot();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ready);
} else {
  ready();
}
