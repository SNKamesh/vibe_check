# Vibe Check — Local Chrome Extension

Vibe Check opens as a Chrome extension page. It does not require a Python server or an always-open PowerShell window.

## One-time setup

1. Extract this repository ZIP to a permanent folder.
2. Double-click `setup-extension.bat` once. It downloads the MediaPipe Vision JS/WASM runtime and the Pose Landmarker model into the extension folder.
3. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`.
4. Pin Vibe Check. Click its toolbar icon once; it opens the dressing room in a new tab.
5. Allow camera access.

After setup, open the dressing room from the extension icon. No Python server or PowerShell window is needed for normal use.

## What runs locally

- Camera capture through Chrome.
- MediaPipe Pose Landmarker inference in the browser.
- Five-second pose calibration.
- Multiple wardrobe image uploads and simple local filename-based category suggestions.
- 2D garment overlays that follow pose landmarks.
- No camera frames or wardrobe images are sent to an AI inference API by this extension.

The first setup downloads dependencies. The camera pose model and the MediaPipe runtime are stored in the extension folder and reused locally.

## Current limitations

This is a basic local AR fitting prototype, not a photorealistic generative try-on system. Garment images are overlaid as 2D images aligned to landmarks. It does not yet remove product-photo backgrounds, segment garments, simulate fabric, model body occlusion, or automatically identify apparel visually. Transparent-background garment PNGs give the cleanest current results. Wardrobe items are currently held in the dressing-room tab's memory and will need to be re-added when that tab is closed.

## Third-party runtime

The setup script downloads MediaPipe Tasks Vision 0.10.14 (Apache-2.0) and the MediaPipe Pose Landmarker Lite model from Google's hosted model storage. See `THIRD_PARTY_NOTICES.md`.


## Device support

Vibe Check is designed for desktop and laptop browsers only (Windows, macOS and Linux). The dressing-room page checks for common mobile and tablet environments and displays a PC-only notice instead of starting the camera. The extension is intended to be loaded unpacked in desktop Chrome or a compatible desktop Chromium browser.
