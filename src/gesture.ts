// Gesture detection — TensorFlow.js hand-pose-detection (MediaPipe Hands).
// Recognizes a stable ✌️ peace sign and fires a callback after the gesture
// holds for ~1 second. Includes smoothing to suppress flicker.

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import type { HandDetector, Hand } from '@tensorflow-models/hand-pose-detection';

// MediaPipe hand landmark indices (21 points per hand).
// 4=thumb tip, 8=index tip, 12=middle tip, 16=ring tip, 20=pinky tip.
// 5/9/13/17 = pip knuckles used as a "folded" reference line.
const TIP = { index: 8, middle: 12, ring: 16, pinky: 20 };
const PIP = { index: 6, middle: 10, ring: 14, pinky: 18 };


export type GestureEvent = 'peace';

export class GestureDetector {
  private detector: HandDetector | null = null;
  private video: HTMLVideoElement;
  private raf = 0;
  private running = false;
  private busy = false;

  // Smoothing: count consecutive frames the peace sign is detected.
  private consecutive = 0;
  private readonly holdFrames: number;
  private fired = false;

  private onStatus: (msg: string) => void;
  private onGesture: (e: GestureEvent) => void;

  constructor(
    video: HTMLVideoElement,
    opts: {
      fps?: number;
      onStatus: (msg: string) => void;
      onGesture: (e: GestureEvent) => void;
    },
  ) {
    this.video = video;
    this.onStatus = opts.onStatus;
    this.onGesture = opts.onGesture;
    // ~1 second hold at the effective detection rate.
    this.holdFrames = Math.round((opts.fps ?? 12) * 1.0);
  }

  async load(): Promise<void> {
    await tf.setBackend('webgl');
    await tf.ready();
    this.onStatus('Loading hand model…');

    this.detector = await handPoseDetection.createDetector(
      handPoseDetection.SupportedModels.MediaPipeHands,
      {
        runtime: 'mediapipe',
        solutionPath:
          'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        modelType: 'lite',
        maxHands: 2,
      } as handPoseDetection.MediaPipeHandsMediaPipeModelConfig,
    );

    this.onStatus('Ready');
  }

  start(): void {
    if (this.running || !this.detector) return;
    this.running = true;
    this.loop();
  }

  pause(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Reset the hold counter so a new gesture must build up again. */
  reset(): void {
    this.consecutive = 0;
    this.fired = false;
  }

  private async loop(): Promise<void> {
    if (!this.running || !this.detector) return;
    if (!this.busy && this.video.readyState >= 2) {
      this.busy = true;
      try {
        const hands = await this.detector.estimateHands(this.video, {
          flipHorizontal: true,
        } as handPoseDetection.MediaPipeHandsMediaPipeEstimationConfig);
        this.process(hands ?? []);
      } catch {
        // transient inference errors are non-fatal
      } finally {
        this.busy = false;
      }
    }
    this.raf = requestAnimationFrame(() => this.loop());
  }

  private process(hands: Hand[]): void {
    if (hands.length === 0) {
      this.consecutive = 0;
      this.onStatus('Show ✌️ to capture');
      return;
    }

    let peace = false;
    for (const hand of hands) {
      if (this.isPeace(hand)) {
        peace = true;
        break;
      }
    }

    if (peace) {
      this.consecutive++;
      this.onStatus('Peace detected ✌️');
      if (this.consecutive >= this.holdFrames && !this.fired) {
        this.fired = true;
        this.onGesture('peace');
      }
    } else {
      this.consecutive = 0;
    }
  }

  /** A finger is "extended" if its tip is farther from the wrist than its PIP. */
  private isExtended(hand: Hand, tipIdx: number, pipIdx: number): boolean {
    const kp = hand.keypoints;
    const tip = kp[tipIdx];
    const pip = kp[pipIdx];
    const mcp = kp[5]; // index MCP as a rough wrist-side anchor
    if (!tip || !pip || !mcp) return false;
    const dTip = dist(tip, mcp);
    const dPip = dist(pip, mcp);
    return dTip > dPip * 1.1;
  }

  /** A finger is "folded" if its tip sits below its PIP knuckle (toward palm). */
  private isFolded(hand: Hand, tipIdx: number, pipIdx: number): boolean {
    const kp = hand.keypoints;
    const tip = kp[tipIdx];
    const pip = kp[pipIdx];
    if (!tip || !pip) return false;
    // In a folded finger the tip is closer to the wrist than the pip.
    const mcp = kp[5];
    if (!mcp) return false;
    return dist(tip, mcp) < dist(pip, mcp);
  }

  private isPeace(hand: Hand): boolean {
    const indexExt = this.isExtended(hand, TIP.index, PIP.index);
    const middleExt = this.isExtended(hand, TIP.middle, PIP.middle);
    const ringFold = this.isFolded(hand, TIP.ring, PIP.ring);
    const pinkyFold = this.isFolded(hand, TIP.pinky, PIP.pinky);
    return indexExt && middleExt && ringFold && pinkyFold;
  }

  dispose(): void {
    this.pause();
    this.detector?.dispose();
    this.detector = null;
  }
}

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}
