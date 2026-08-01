// Effects module — floating hearts, sparkles, and blur bubbles.
// Uses a single rAF loop and recycles DOM nodes for performance.

const HEARTS = ['❤', '💖', '💕', '🌸', '✨', '💗'];
const HEART_COUNT = 14;
const SPARKLE_COUNT = 18;

export class Effects {
  private container: HTMLElement;
  private hearts: HTMLElement[] = [];
  private sparkles: HTMLElement[] = [];
  private raf = 0;
  private running = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.spawn();
  }

  private spawn(): void {
    // Hearts
    for (let i = 0; i < HEART_COUNT; i++) {
      const el = document.createElement('div');
      el.className = 'particle';
      el.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
      el.style.fontSize = `${14 + Math.random() * 18}px`;
      this.container.appendChild(el);
      this.hearts.push(el);
      this.resetHeart(el, Math.random() * 12);
    }
    // Sparkles
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const el = document.createElement('div');
      el.className = 'sparkle';
      const size = 3 + Math.random() * 6;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      this.container.appendChild(el);
      this.sparkles.push(el);
      this.resetSparkle(el, Math.random() * 3);
    }
  }

  private resetHeart(el: HTMLElement, delay: number): void {
    el.style.left = `${Math.random() * 100}%`;
    el.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
    const dur = 9 + Math.random() * 8;
    el.style.animation = 'none';
    // Force reflow so animation restarts
    void el.offsetWidth;
    el.style.animation = `floatUp ${dur}s linear ${delay}s forwards`;
  }

  private resetSparkle(el: HTMLElement, delay: number): void {
    el.style.left = `${Math.random() * 100}%`;
    el.style.top = `${Math.random() * 100}%`;
    const dur = 2 + Math.random() * 3;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = `twinkle ${dur}s ease-in-out ${delay}s infinite`;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private tick(): void {
    if (!this.running) return;
    // Re-seed hearts that have finished their animation
    for (const el of this.hearts) {
      const cs = getComputedStyle(el);
      if (cs.opacity === '0' && cs.animationName !== 'none') {
        this.resetHeart(el, 0);
      }
    }
    this.raf = requestAnimationFrame(() => this.tick());
  }

  dispose(): void {
    this.stop();
    this.container.replaceChildren();
    this.hearts = [];
    this.sparkles = [];
  }
}
