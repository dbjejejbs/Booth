# Romantic Frames

Drop transparent PNG frames here to customize your photobooth.

## How it works

- Name your files `frame1.png`, `frame2.png`, `frame3.png`, `frame4.png`, `frame5.png`.
- Each PNG should be transparent with a **3:4 portrait** aspect ratio (e.g. 1080×1440).
- The app loads them automatically on startup.
- If no PNGs are found, built-in decorative frames are used instead.

## Adding more frames

To support more than 5 frames, edit the `FRAME_FILES` list in `src/frames.ts`.

## Switching frames

Tap the **Frame** button in the bottom dock to cycle through available frames.
